require('dotenv').config();
const path = require('path');
const { getSession, setSession, resetSession } = require('./sessionStore');
const { getZones, getProjectsByZone, getProjectById, getMediaByProject } = require('./db');
const { sendText, sendMedia, sendDocument } = require('./whatsappClient');
const { overlayImageText, overlayVideoText } = require('./mediaProcessor');
const { uploadMedia } = require('./cloudinaryClient');

const COMPANY = process.env.COMPANY_NAME || 'Godrej Properties';

async function handleMessage(from, text) {
  const session = getSession(from);
  const input = (text || '').trim();

  try {
    switch (session.step) {
      case 'start':
        await handleStart(from);
        break;
      case 'zone_selected':
        await handleZoneSelection(from, input, session);
        break;
      case 'project_selected':
        await handleProjectSelection(from, input, session);
        break;
      case 'action_selected':
        await handleActionSelection(from, input, session);
        break;
      case 'awaiting_name':
        await handleNameInput(from, input, session);
        break;
      case 'awaiting_number':
        await handleNumberInput(from, input, session);
        break;
      default:
        await handleStart(from);
    }
  } catch (err) {
    console.error('[BotFlow] Error:', err.message);
    if (err.message && err.message.includes('DB')) {
      await sendText(from, "We're experiencing technical difficulties. Please try again later.");
    }
  }
}

async function handleStart(from) {
  let zones;
  try {
    zones = await getZones();
  } catch (err) {
    await sendText(from, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  const zoneList = zones.map((z, i) => `${i + 1}. ${z.name}`).join('\n');
  setSession(from, { step: 'zone_selected', zoneOptions: zones });

  await sendText(from, `Welcome to ${COMPANY} 🏠\n\nPlease select your zone in Mumbai:\n\n${zoneList}\n\nReply with the number of your choice.`);
}

async function handleZoneSelection(from, input, session) {
  const zones = session.zoneOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > zones.length) {
    const zoneList = zones.map((z, i) => `${i + 1}. ${z.name}`).join('\n');
    await sendText(from, `Invalid choice. Please reply with one of the listed numbers.\n\n${zoneList}`);
    return;
  }

  const selectedZone = zones[choice - 1];
  let projects;
  try {
    projects = await getProjectsByZone(selectedZone.id);
  } catch (err) {
    await sendText(from, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  setSession(from, { step: 'project_selected', selectedZone, projectOptions: projects });

  await sendText(from, `Great! Here are our ongoing projects in ${selectedZone.name}:\n\n${projectList}\n\nReply with the number of your choice.`);
}

async function handleProjectSelection(from, input, session) {
  const projects = session.projectOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > projects.length) {
    const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    await sendText(from, `Invalid choice. Please reply with one of the listed numbers.\n\n${projectList}`);
    return;
  }

  const selectedProject = projects[choice - 1];
  setSession(from, { step: 'action_selected', selectedProject });

  await sendText(from, `You selected: ${selectedProject.name} 🏗️\n\nWhat would you like?\n1. Creatives (Images)\n2. Creatives (Video)\n3. Brochure\n4. SMS\n\nReply with 1, 2, 3, or 4.`);
}

async function handleActionSelection(from, input, session) {
  const choice = parseInt(input, 10);

  if (choice === 1 || choice === 2) {
    const mediaType = choice === 1 ? 'image' : 'video';
    setSession(from, { step: 'awaiting_name', pendingMediaType: mediaType });
    await sendText(from, 'Please enter your full name:');

  } else if (choice === 3) {
    const project = session.selectedProject;
    let brochures;
    try {
      brochures = await getMediaByProject(project.id, 'brochure');
    } catch (err) {
      await sendText(from, "We're experiencing technical difficulties. Please try again later.");
      return;
    }

    if (!brochures || brochures.length === 0) {
      await sendText(from, 'Brochure not available for this project yet. Please try another option.');
      return;
    }

    for (const b of brochures) {
      const url = b.cloudinary_url || b.file_path;
      const fileName = path.basename(b.file_path);
      try {
        await sendDocument(from, url, fileName);
      } catch (err) {
        console.error('[BotFlow] Brochure send error:', err.message);
        await sendText(from, 'Failed to send brochure. Please try again.');
      }
    }

    resetSession(from);
    await sendText(from, 'Is there anything else we can help you with? Reply Hi to start again.');

  } else if (choice === 4) {
    const project = session.selectedProject;
    try {
      const full = await getProjectById(project.id);
      await sendText(from, full.sms_message);
    } catch (err) {
      await sendText(from, "We're experiencing technical difficulties. Please try again later.");
      return;
    }
    resetSession(from);
    await sendText(from, 'Is there anything else we can help you with? Reply Hi to start again.');

  } else {
    await sendText(from, 'Invalid choice. Please reply with one of the listed numbers.\n\n1. Creatives (Images)\n2. Creatives (Video)\n3. Brochure\n4. SMS');
  }
}

async function handleNameInput(from, input, session) {
  if (!input) {
    await sendText(from, 'Please enter your full name:');
    return;
  }
  setSession(from, { step: 'awaiting_number', userName: input });
  await sendText(from, `Thank you, ${input}! \n\nNow please enter your contact number:`);
}

async function handleNumberInput(from, input, session) {
  if (!input) {
    await sendText(from, 'Please enter your contact number:');
    return;
  }

  setSession(from, { userNumber: input });

  const { selectedProject, pendingMediaType, userName } = { ...session, userNumber: input };

  let mediaRows;
  try {
    mediaRows = await getMediaByProject(selectedProject.id, pendingMediaType);
  } catch (err) {
    await sendText(from, "We're experiencing technical difficulties. Please try again later.");
    return;
  }

  if (!mediaRows || mediaRows.length === 0) {
    await sendText(from, 'No media found for this project. Please try again later.');
    resetSession(from);
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
      await sendText(from, 'Media processing failed. Please try again.');
      continue;
    }

    let cloudUrl;
    try {
      cloudUrl = await uploadMedia(processedPath);
    } catch (err) {
      console.error('[BotFlow] Cloudinary upload error:', err.message);
      await sendText(from, 'Media processing failed. Please try again.');
      continue;
    }

    try {
      await sendMedia(from, pendingMediaType, cloudUrl, 'Your personalised creative');
    } catch (err) {
      console.error('[BotFlow] WhatsApp send error:', err.message);
      await sendText(from, 'Message delivery failed. Please try again.');
    }
  }

  resetSession(from);
  await sendText(from, 'Your personalised creatives have been sent! 🎉\nIs there anything else? Reply Hi to start again.');
}

module.exports = { handleMessage };
