require('dotenv').config();
const path = require('path');
const { getSession, setSession, resetSession } = require('./sessionStore');
const { getZones, getProjectsByZone, getProjectById, getMediaByProject } = require('./db');
const { sendText, sendImage, sendVideo, sendDocument } = require('./whatsappClient');
const { overlayImageText, overlayVideoText } = require('./mediaProcessor');
const { uploadMedia } = require('./cloudinaryClient');

const COMPANY = process.env.COMPANY_NAME || 'Godrej Properties';

async function handleMessage(sock, jid, text) {
  const session = getSession(jid);
  const input = (text || '').trim();

  try {
    switch (session.step) {
      case 'start':
        await handleStart(sock, jid);
        break;
      case 'zone_selected':
        await handleZoneSelection(sock, jid, input, session);
        break;
      case 'project_selected':
        await handleProjectSelection(sock, jid, input, session);
        break;
      case 'action_selected':
        await handleActionSelection(sock, jid, input, session);
        break;
      case 'awaiting_name':
        await handleNameInput(sock, jid, input, session);
        break;
      case 'awaiting_number':
        await handleNumberInput(sock, jid, input, session);
        break;
      default:
        await handleStart(sock, jid);
    }
  } catch (err) {
    console.error('[BotFlow] Error:', err.message);
    if (err.message && err.message.includes('DB')) {
      await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
    }
  }
}

async function handleStart(sock, jid) {
  let zones;
  try {
    zones = await getZones();
  } catch (err) {
    await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  const zoneList = zones.map((z, i) => `${i + 1}. ${z.name}`).join('\n');
  setSession(jid, { step: 'zone_selected', zoneOptions: zones });

  await sendText(sock, jid, `Welcome to ${COMPANY} 🏠\n\nPlease select your zone in Mumbai:\n\n${zoneList}\n\nReply with the number of your choice.`);
}

async function handleZoneSelection(sock, jid, input, session) {
  const zones = session.zoneOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > zones.length) {
    const zoneList = zones.map((z, i) => `${i + 1}. ${z.name}`).join('\n');
    await sendText(sock, jid, `Invalid choice. Please reply with one of the listed numbers.\n\n${zoneList}`);
    return;
  }

  const selectedZone = zones[choice - 1];
  let projects;
  try {
    projects = await getProjectsByZone(selectedZone.id);
  } catch (err) {
    await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  setSession(jid, { step: 'project_selected', selectedZone, projectOptions: projects });

  await sendText(sock, jid, `Great! Here are our ongoing projects in ${selectedZone.name}:\n\n${projectList}\n\nReply with the number of your choice.`);
}

async function handleProjectSelection(sock, jid, input, session) {
  const projects = session.projectOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > projects.length) {
    const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    await sendText(sock, jid, `Invalid choice. Please reply with one of the listed numbers.\n\n${projectList}`);
    return;
  }

  const selectedProject = projects[choice - 1];
  setSession(jid, { step: 'action_selected', selectedProject });

  await sendText(sock, jid, `You selected: ${selectedProject.name} 🏗️\n\nWhat would you like?\n1. Creatives (Images)\n2. Creatives (Video)\n3. Brochure\n4. SMS\n\nReply with 1, 2, 3, or 4.`);
}

async function handleActionSelection(sock, jid, input, session) {
  const choice = parseInt(input, 10);

  if (choice === 1 || choice === 2) {
    const mediaType = choice === 1 ? 'image' : 'video';
    setSession(jid, { step: 'awaiting_name', pendingMediaType: mediaType });
    await sendText(sock, jid, 'Please enter your full name:');

  } else if (choice === 3) {
    const project = session.selectedProject;
    let brochures;
    try {
      brochures = await getMediaByProject(project.id, 'brochure');
    } catch (err) {
      await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
      return;
    }

    if (!brochures || brochures.length === 0) {
      await sendText(sock, jid, 'Brochure not available for this project yet. Please try another option.');
      return;
    }

    for (const b of brochures) {
      const url = b.cloudinary_url || b.file_path;
      const fileName = path.basename(b.file_path);
      try {
        await sendDocument(sock, jid, url, fileName);
      } catch (err) {
        console.error('[BotFlow] Brochure send error:', err.message);
        await sendText(sock, jid, 'Failed to send brochure. Please try again.');
      }
    }

    resetSession(jid);
    await sendText(sock, jid, 'Is there anything else we can help you with? Reply Hi to start again.');

  } else if (choice === 4) {
    const project = session.selectedProject;
    try {
      const full = await getProjectById(project.id);
      await sendText(sock, jid, full.sms_message);
    } catch (err) {
      await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
      return;
    }
    resetSession(jid);
    await sendText(sock, jid, 'Is there anything else we can help you with? Reply Hi to start again.');

  } else {
    await sendText(sock, jid, 'Invalid choice. Please reply with one of the listed numbers.\n\n1. Creatives (Images)\n2. Creatives (Video)\n3. Brochure\n4. SMS');
  }
}

async function handleNameInput(sock, jid, input, session) {
  if (!input) {
    await sendText(sock, jid, 'Please enter your full name:');
    return;
  }
  setSession(jid, { step: 'awaiting_number', userName: input });
  await sendText(sock, jid, `Thank you, ${input}! \n\nNow please enter your contact number:`);
}

async function handleNumberInput(sock, jid, input, session) {
  if (!input) {
    await sendText(sock, jid, 'Please enter your contact number:');
    return;
  }

  setSession(jid, { userNumber: input });

  const { selectedProject, pendingMediaType, userName } = { ...session, userNumber: input };

  let mediaRows;
  try {
    mediaRows = await getMediaByProject(selectedProject.id, pendingMediaType);
  } catch (err) {
    await sendText(sock, jid, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  if (!mediaRows || mediaRows.length === 0) {
    await sendText(sock, jid, 'No media found for this project. Please try again later.');
    resetSession(jid);
    return;
  }

  for (const media of mediaRows) {
    const rawPath = path.join(__dirname, '..', media.file_path);
    const ext = path.extname(media.file_path);
    const outFile = `processed_${Date.now()}_${media.id}${ext}`;

    let processedPath;
    try {
      if (pendingMediaType === 'image') {
        processedPath = await overlayImageText(rawPath, outFile, userName, input);
      } else {
        processedPath = await overlayVideoText(rawPath, outFile, userName, input);
      }
    } catch (err) {
      console.error('[BotFlow] Media processing error:', err.message);
      await sendText(sock, jid, 'Media processing failed. Please try again.');
      continue;
    }

    let cloudUrl;
    try {
      cloudUrl = await uploadMedia(processedPath);
    } catch (err) {
      console.error('[BotFlow] Cloudinary upload error:', err.message);
      await sendText(sock, jid, 'Media processing failed. Please try again.');
      continue;
    }

    try {
      if (pendingMediaType === 'image') {
        await sendImage(sock, jid, cloudUrl, 'Your personalised creative');
      } else {
        await sendVideo(sock, jid, cloudUrl, 'Your personalised creative');
      }
    } catch (err) {
      console.error('[BotFlow] WhatsApp send error:', err.message);
      await sendText(sock, jid, 'Message delivery failed. Please try again.');
    }
  }

  resetSession(jid);
  await sendText(sock, jid, 'Your personalised creatives have been sent! 🎉\nIs there anything else? Reply Hi to start again.');
}

module.exports = { handleMessage };
