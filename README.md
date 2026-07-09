# chakraOS - AI-First Frequency Operating System

[![Built with Bilt](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.bilt.me%2Fapi%2Fbadge)](https://bilt.me)

> **chakraOS is not a meditation app. It is a generative Frequency Operating System where sound, visuals, AI coaching, progression and user experience emerge from a single procedural engine driven by frequency.**

## 🌟 Core Principle

**Everything derives from frequency.** No hardcoded colors, gradients, themes, or duplicate visual variants. The entire user experience emerges from a single procedural pipeline.

## 🏗️ Architecture

```
Field State → Frequency Engine → Derived Experience
    ↓              ↓                    ↓
(baseHz,      (Session,             (Colors,
 beatHz,       Colors,              Audio,
 breath,       Audio,               Visuals,
 coherence,    Brainwave,           XP,
 energy,       Visualization,       Coach)
 focus,        XP Multiplier,
 stress,       Coach Rec)
 emotion,
 duration)
```

## ✨ Key Features

- **🎵 Real-time Audio Synthesis**: Binaural beats and pure sine waves generated from react-native-audio-api
- **🎨 Frequency Canvas**: Audio-reactive visualizations with particle systems responding to live frequency analysis
- **🧘 Reactive Body Field**: Chakras glow and pulse based on active frequencies with OKLab color interpolation
- **🤖 AI Frequency Coach**: Generates optimal frequencies dynamically instead of selecting preset sessions
- **📈 Dynamic XP Engine**: Rewards based on actual physiological improvements (HRV, breathing coherence, mood)
- **📦 Recipe Engine**: Procedural session generation from user context and field analysis

## Project info

**Preview URL**: https://app.bilt.me/project/8edef0d5-e41f-4af5-8a12-744084a5748d/preview

**Project ID**: `8edef0d5-e41f-4af5-8a12-744084a5748d`

## How can I edit this app?

There are several ways of editing your application.

**Use Bilt**

Simply visit your [Bilt Project](https://app.bilt.me/agent/8edef0d5-e41f-4af5-8a12-744084a5748d) and start sending messages. Describe what you want to change, add, or fix in natural language.

Changes made via Bilt are instant - just send a message and your app updates.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can export the source code from Bilt and make changes directly.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Export and clone your Bilt project.
# (Download source from Bilt or connect to your git repo)
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the Expo development server.
npx expo start
```

Scan the QR code with Expo Go on your phone to see your app running locally.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- React Native
- Expo
- TypeScript
- AsyncStorage (local data persistence)
- Expo Router (navigation)

All generated automatically by Bilt from your natural language instructions.

## How can I test this project?

**Option 1: Instant Preview (Recommended)**

Open the preview URL in your browser: `https://app.bilt.me/project/8edef0d5-e41f-4af5-8a12-744084a5748d/preview`

Scan the QR code with Expo Go ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) on your phone.

**Option 2: Run Locally**

```sh
npm install
npx expo start
```

Then scan the QR code with Expo Go.

## How can I deploy this project?

Go to your [Bilt Project](https://app.bilt.me/agent/8edef0d5-e41f-4af5-8a12-744084a5748d), after that go to Settings -> App Store.

### Deploy with Bilt

Simply send a message to your Bilt project: "Deploy this app to production"

Bilt will handle the build and provide you with download links or submission-ready builds.

## How can I make changes to my app?

**Via Bilt (Easiest)**

Visit your [Bilt Project](https://app.bilt.me/agent/8edef0d5-e41f-4af5-8a12-744084a5748d) and send a message describing what you want:

- "Add a dark mode toggle"
- "Change the button color to blue"
- "Add a new screen for user settings"
- "Fix the navigation bar spacing"

Bilt understands natural language and updates your app automatically.

**Via Code**

Export the source, make changes in your IDE, and test locally with `npx expo start`.

## Can I use this with the MCP protocol?

Yes! Bilt is available as a remote MCP server at `https://mcp.bilt.me/mcp`.

Connect any MCP-compatible AI agent (Claude Desktop, OpenClaw, etc.) to programmatically build and modify mobile apps.

**Example MCP integration:**

```json
{
  "mcpServers": {
    "bilt": {
      "transport": {
        "type": "sse",
        "url": "https://mcp.bilt.me/mcp/sse",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      }
    }
  }
}
```

Read more:

- [Bilt MCP Documentation](https://bilt.me/docs)
- [MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.buildingapplications%2Fmcp/versions/latest)

## Need help?

- 📚 [Bilt Documentation](https://bilt.me/docs)
- 💬 [Discord Community](https://discord.gg/3FqNgmSYdZ)
- 🐦 [Twitter Updates](https://twitter.com/biltmeanapp)
- 📧 Email: support@bilt.me

---

<div align="center">

**Built by AI. No code required.** ✨

[Try Bilt](https://bilt.me) • [View Docs](https://bilt.me/docs) • [Docs MCP Server](https://bilt.me/docs/mcp)

</div>
