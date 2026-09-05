// What an entry lets you *do*, independent of which program does it.
//
// The catalog answers "is this software installed"; this answers "can this machine do this
// thing". They are different questions, and conflating them produced a string of real errors:
// Junction was marked Linux-only because the XDG portal is Linux-only, when picking which browser
// opens a link is something all three platforms can do. LACT was marked as having "no counterpart
// on macOS or Windows" when MSI Afterburner does the same job. Bazaar was called a Linux-only
// *concept* when the Microsoft Store and the Mac App Store are the same idea, just preinstalled.
//
// Each of those was found by a person noticing, one at a time. Tags make it a query instead:
// `deno task capabilities` lists every capability with no entry on some platform, so the gap is
// computed rather than remembered.
//
// A closed vocabulary rather than free text, for the same reason INSTALL_METHODS is closed —
// free tags drift into "3d-modeling" and "3d-modelling" within a week, and then the comparison
// this exists for silently stops working.

export const CAPABILITIES = {
  // Web and communication
  "web-browsing": "Browse the web",
  "email": "Read and send email",
  "messaging": "Instant messaging and chat",
  "video-calls": "Video and voice calls",
  "contacts": "Keep an address book",
  "calendar": "Keep a calendar and appointments",
  "sms": "Send and receive phone text messages",

  // Files and sync
  "cloud-file-sync": "Sync files with a cloud provider",
  "file-transfer": "Move data over the network by hand",
  "file-management": "Browse and organise files",
  "filesystem-support": "Read and write another platform's filesystems",
  "disk-snapshots": "Take restorable snapshots of the system",

  // Media playback
  "video-playback": "Play video files",
  "music-playback": "Play music",
  "photo-management": "Organise and view a photo library",
  "maps": "View maps and navigate",
  "weather": "Check the weather",
  "news": "Read a news feed",

  // Media creation
  "video-editing": "Edit video",
  "video-transcoding": "Convert video between formats",
  "media-download": "Download video and audio from the web",
  "audio-recording": "Record audio",
  "music-creation": "Compose and produce music",
  "screen-recording": "Record the screen",
  "live-streaming": "Broadcast live video",
  "webcam": "Use a webcam",

  // Graphics and 3D
  "raster-graphics": "Edit photos and bitmap images",
  "vector-graphics": "Draw scalable vector artwork",
  "3d-modeling": "Create and edit 3D models",
  "3d-viewing": "View 3D models",
  "3d-slicing": "Prepare 3D models for printing",

  // Documents
  "word-processing": "Write documents",
  "spreadsheets": "Work with spreadsheets",
  "presentations": "Build slide decks",
  "note-taking": "Keep notes",
  "markdown-editing": "Write Markdown",
  "mind-mapping": "Draw mind maps and knowledge graphs",
  "task-management": "Track tasks and to-do lists",

  // Development
  "version-control": "Track source history",
  "code-editing": "Edit code",
  "ide-management": "Install and update IDEs",
  "terminal-tools": "Core command-line utilities",
  "programming-language": "A language toolchain",
  "build-tools": "Build and compile projects",
  "json-processing": "Process JSON on the command line",
  "containers": "Run application containers",
  "container-gui": "Manage containers from a desktop interface",
  "virtualization": "Run virtual machines",
  "emulation": "Emulate other machines and architectures",
  "infrastructure-as-code": "Define infrastructure declaratively",
  "cloud-cli": "Drive a cloud provider from the command line",
  "ai-coding-assistant": "AI help while writing code",
  "system-limits": "Tune kernel resource limits for development",

  // AI
  "local-llm": "Run language models on this machine",
  "ai-chat": "Chat with an AI assistant",
  "speech-to-text": "Dictate text by voice",
  "voice-assistant": "A system voice assistant",

  // Gaming
  "game-store": "Buy and install games",
  "game-launcher": "Launch and organise a game library",
  "games": "A game itself",
  "game-streaming-client": "Play games streamed from another machine",
  "game-streaming-host": "Stream games to another machine",
  "windows-compatibility": "Run Windows software on another OS",
  "game-overlay": "In-game capture and performance overlay",

  // Security and privacy
  "password-manager": "Store and fill passwords",
  "vpn": "Route traffic through a VPN",
  "mesh-vpn": "Connect your own machines privately",
  "encryption": "Encrypt files or volumes",
  "firewall": "Block unsolicited incoming connections",
  "system-hardening": "Reduce the attack surface of the system",
  "ssh": "Connect to machines over SSH",
  "biometric-auth": "Sign in with a fingerprint or face",
  "automatic-updates": "Apply security updates unattended",
  "telemetry-collection": "Report usage or hardware data to a vendor",
  "tracker-blocking": "Block analytics and ad domains",
  "dns-privacy": "Encrypt DNS queries",
  "location-services": "Share the machine's location with apps",
  "screen-recall": "Continuously record what is on screen",
  "advertising": "Show ads or upsells in the product",
  "feedback-reporting": "Send feedback and diagnostics to a vendor",

  // System
  "system-monitoring": "Watch CPU, memory, disk and network use",
  "gpu-tuning": "Set GPU fan curves, clocks and power limits",
  "package-management": "Install software from a package system",
  "app-storefront": "Browse and install apps from a store",
  "sandbox-permissions": "Review and edit app sandbox permissions",
  "desktop-extensions": "Extend the desktop shell",
  "remote-desktop": "Control another machine's desktop",
  "remote-assistance": "Let someone else help on this machine",
  "phone-integration": "Link a phone to the desktop",
  "network-scanning": "Scan a network for hosts and ports",
  "document-scanning": "Scan paper documents",
  "device-management": "Configure peripherals",
  "macro-keypad": "Drive a macro keypad",
  "link-routing": "Choose which app opens a link",
  "desktop-appearance": "Change how the desktop looks",
  "input-configuration": "Configure keyboard, mouse and trackpad",
  "power-management": "Control power and performance profiles",
  "memory-management": "Tune swap and memory behaviour",
  "boot-behavior": "Control shutdown and startup behaviour",
  "shell-configuration": "Configure the command-line shell",
  "desktop-automation": "Automate desktop tasks",
  "mixed-reality": "Use a VR or mixed-reality headset",
  "help-support": "Built-in help and support",
  "clock-timers": "Alarms, timers and world clocks",
  "ambient-sound": "Play background ambience for focus",
} as const;

export type Capability = keyof typeof CAPABILITIES;

export const CAPABILITY_NAMES = Object.keys(CAPABILITIES) as Capability[];

export function isCapability(value: string): value is Capability {
  return Object.hasOwn(CAPABILITIES, value);
}
