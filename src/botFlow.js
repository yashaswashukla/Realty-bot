require("dotenv").config();
const { getSession, setSession, resetSession } = require("./sessionStore");
const {
  getCities,
  getProjectsByCity,
  getProjectById,
  getMediaByProject,
} = require("./db");
const { sendText, sendMedia } = require("./whatsappClient");
const { overlayImageText, overlayVideoText } = require("./mediaProcessor");
const { uploadMedia } = require("./cloudinaryClient");
const path = require("path");

const COMPANY = process.env.COMPANY_NAME || "Godrej Properties";

async function handleMessage(from, text) {
  const session = getSession(from);
  const input = (text || "").trim();

  try {
    switch (session.step) {
      case "start":
        await handleStart(from);
        break;

      case "city_selected":
        await handleCitySelection(from, input, session);
        break;

      case "project_selected":
        await handleProjectSelection(from, input, session);
        break;

      case "action_selected":
        await handleActionSelection(from, input, session);
        break;

      case "awaiting_name":
        await handleNameInput(from, input, session);
        break;

      case "awaiting_number":
        await handleNumberInput(from, input, session);
        break;

      default:
        await handleStart(from);
    }
  } catch (err) {
    console.error("[BotFlow] Error:", err.message);
    if (err.message && err.message.includes("DB")) {
      await sendText(
        from,
        "We're experiencing technical difficulties. Please try again later.",
      );
    }
  }
}

async function handleStart(from) {
  let cities;
  try {
    cities = await getCities();
  } catch (err) {
    await sendText(
      from,
      "We're experiencing technical difficulties. Please try again later.",
    );
    return;
  }

  const cityList = cities.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
  setSession(from, { step: "city_selected", cityOptions: cities });

  await sendText(
    from,
    `Welcome to ${COMPANY} 🏠\n\nPlease select your city:\n${cityList}\n\nReply with the number of your choice.`,
  );
}

async function handleCitySelection(from, input, session) {
  const cities = session.cityOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > cities.length) {
    const cityList = cities.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
    await sendText(
      from,
      `Invalid choice. Please reply with one of the listed numbers.\n\n${cityList}`,
    );
    return;
  }

  const selectedCity = cities[choice - 1];
  let projects;
  try {
    projects = await getProjectsByCity(selectedCity.id);
  } catch (err) {
    await sendText(
      from,
      "We're experiencing technical difficulties. Please try again later.",
    );
    return;
  }

  const projectList = projects.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
  setSession(from, {
    step: "project_selected",
    selectedCity,
    projectOptions: projects,
  });

  await sendText(
    from,
    `Great! Here are our ongoing projects in ${selectedCity.name}:\n\n${projectList}\n\nReply with the number of your choice.`,
  );
}

async function handleProjectSelection(from, input, session) {
  const projects = session.projectOptions || [];
  const choice = parseInt(input, 10);

  if (!choice || choice < 1 || choice > projects.length) {
    const projectList = projects
      .map((p, i) => `${i + 1}. ${p.name}`)
      .join("\n");
    await sendText(
      from,
      `Invalid choice. Please reply with one of the listed numbers.\n\n${projectList}`,
    );
    return;
  }

  const selectedProject = projects[choice - 1];
  setSession(from, { step: "action_selected", selectedProject });

  await sendText(
    from,
    `You selected: ${selectedProject.name} 🏗️\n\nWhat would you like?\n1. Creatives: Images\n2. Creatives: Video\n3. SMS\n\nReply with 1, 2, or 3.`,
  );
}

async function handleActionSelection(from, input, session) {
  const choice = parseInt(input, 10);

  if (choice === 1 || choice === 2) {
    const mediaType = choice === 1 ? "image" : "video";
    setSession(from, { step: "awaiting_name", pendingMediaType: mediaType });
    await sendText(from, "Please enter your full name:");
  } else if (choice === 3) {
    const project = session.selectedProject;
    try {
      const full = await getProjectById(project.id);
      await sendText(from, full.sms_message);
    } catch (err) {
      await sendText(
        from,
        "We're experiencing technical difficulties. Please try again later.",
      );
      return;
    }
    resetSession(from);
    await sendText(
      from,
      "Is there anything else we can help you with? Reply Hi to start again.",
    );
  } else {
    await sendText(
      from,
      "Invalid choice. Please reply with one of the listed numbers.\n\n1. Creatives: Images\n2. Creatives: Video\n3. SMS",
    );
  }
}

async function handleNameInput(from, input, session) {
  if (!input) {
    await sendText(from, "Please enter your full name:");
    return;
  }
  setSession(from, { step: "awaiting_number", userName: input });
  await sendText(
    from,
    `Thank you, ${input}! \n\nNow please enter your contact number:`,
  );
}

async function handleNumberInput(from, input, session) {
  if (!input) {
    await sendText(from, "Please enter your contact number:");
    return;
  }

  setSession(from, { userNumber: input });

  const { selectedProject, pendingMediaType, userName } = {
    ...session,
    userNumber: input,
  };

  let mediaRows;
  try {
    mediaRows = await getMediaByProject(selectedProject.id, pendingMediaType);
  } catch (err) {
    await sendText(
      from,
      "We're experiencing technical difficulties. Please try again later.",
    );
    return;
  }

  if (!mediaRows || mediaRows.length === 0) {
    await sendText(
      from,
      "No media found for this project. Please try again later.",
    );
    resetSession(from);
    return;
  }

  for (const media of mediaRows) {
    const rawPath = path.join(__dirname, "..", media.file_path);
    const ext = path.extname(media.file_path);
    const outFile = `processed_${Date.now()}_${media.id}${ext}`;

    let processedPath;
    try {
      if (pendingMediaType === "image") {
        processedPath = await overlayImageText(
          rawPath,
          outFile,
          userName,
          input,
        );
      } else {
        processedPath = await overlayVideoText(
          rawPath,
          outFile,
          userName,
          input,
        );
      }
    } catch (err) {
      console.error("[BotFlow] Media processing error:", err.message);
      await sendText(from, "Media processing failed. Please try again.");
      continue;
    }

    let cloudUrl;
    try {
      cloudUrl = await uploadMedia(processedPath);
    } catch (err) {
      console.error("[BotFlow] Cloudinary upload error:", err.message);
      await sendText(from, "Media processing failed. Please try again.");
      continue;
    }

    try {
      await sendMedia(
        from,
        pendingMediaType,
        cloudUrl,
        "Your personalised creative",
      );
    } catch (err) {
      console.error("[BotFlow] WhatsApp send error:", err.message);
      await sendText(from, "Message delivery failed. Please try again.");
    }
  }

  resetSession(from);
  await sendText(
    from,
    "Your personalised creatives have been sent! 🎉\nIs there anything else? Reply Hi to start again.",
  );
}

module.exports = { handleMessage };
