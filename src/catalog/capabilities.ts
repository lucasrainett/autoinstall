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
  "web-browsing": { description: "Browse the web", category: "browsers" },
  "email": { description: "Read and send email", category: "communication" },
  "messaging": { description: "Instant messaging and chat", category: "communication" },
  "video-calls": { description: "Video and voice calls", category: "communication" },
  "contacts": { description: "Keep an address book", category: "communication" },
  "calendar": { description: "Keep a calendar and appointments", category: "productivity" },
  "sms": { description: "Send and receive phone text messages", category: "communication" },

  // Files and sync
  "cloud-file-sync": { description: "Sync files with a cloud provider", category: "productivity" },
  "file-transfer": {
    description: "Move data over the network from a shell",
    category: "dev-tools",
  },
  "file-sharing": {
    description: "Send files between your own devices",
    category: "system-utilities",
  },
  "file-management": { description: "Browse and organise files", category: "system-utilities" },
  "filesystem-support": {
    description: "Read and write another platform's filesystems",
    category: "system-utilities",
  },
  "disk-snapshots": {
    description: "Take restorable snapshots of the system",
    category: "system-utilities",
  },

  // Media playback
  "video-playback": { description: "Play video files", category: "media" },
  "music-playback": { description: "Play music", category: "media" },
  "photo-management": { description: "Organise and view a photo library", category: "media" },
  "maps": { description: "View maps and navigate", category: "media" },
  "weather": { description: "Check the weather", category: "system-utilities" },
  "news": { description: "Read a news feed", category: "media" },

  // Media creation
  "video-editing": { description: "Edit video", category: "creative" },
  "video-transcoding": { description: "Convert video between formats", category: "media" },
  "media-download": { description: "Download video and audio from the web", category: "media" },
  "audio-recording": { description: "Record audio", category: "creative" },
  "music-creation": { description: "Compose and produce music", category: "creative" },
  "screen-recording": { description: "Record the screen", category: "media" },
  "live-streaming": { description: "Broadcast live video", category: "media" },
  "webcam": { description: "Use a webcam", category: "media" },

  // Graphics and 3D
  "raster-graphics": { description: "Edit photos and bitmap images", category: "creative" },
  "vector-graphics": { description: "Draw scalable vector artwork", category: "creative" },
  "3d-modeling": { description: "Create and edit 3D models", category: "creative" },
  "3d-viewing": { description: "View 3D models", category: "media" },
  "3d-slicing": { description: "Prepare 3D models for printing", category: "3d-printing" },

  // Documents
  "word-processing": { description: "Write documents", category: "productivity" },
  "spreadsheets": { description: "Work with spreadsheets", category: "productivity" },
  "presentations": { description: "Build slide decks", category: "productivity" },
  "note-taking": { description: "Keep notes", category: "productivity" },
  "markdown-editing": { description: "Write Markdown", category: "productivity" },
  "mind-mapping": { description: "Draw mind maps and knowledge graphs", category: "creative" },
  "task-management": { description: "Track tasks and to-do lists", category: "productivity" },

  // Development
  "version-control": { description: "Track source history", category: "dev-tools" },
  "code-editing": { description: "Edit code", category: "dev-tools" },
  "ide-management": { description: "Install and update IDEs", category: "dev-tools" },
  "terminal-tools": { description: "Core command-line utilities", category: "dev-tools" },
  "programming-language": { description: "A language toolchain", category: "dev-tools" },
  "build-tools": { description: "Build and compile projects", category: "dev-tools" },
  "json-processing": { description: "Process JSON on the command line", category: "dev-tools" },
  "containers": { description: "Run application containers", category: "dev-tools" },
  "container-gui": {
    description: "Manage containers from a desktop interface",
    category: "dev-tools",
  },
  "virtualization": { description: "Run virtual machines", category: "dev-tools" },
  "emulation": { description: "Emulate other machines and architectures", category: "dev-tools" },
  "infrastructure-as-code": {
    description: "Define infrastructure declaratively",
    category: "dev-tools",
  },
  "cloud-cli": {
    description: "Drive a cloud provider from the command line",
    category: "dev-tools",
  },
  "ai-coding-assistant": { description: "AI help while writing code", category: "ai" },
  "system-limits": {
    description: "Tune kernel resource limits for development",
    category: "dev-tools",
  },

  // AI
  "local-llm": { description: "Run language models on this machine", category: "ai" },
  "ai-chat": { description: "Chat with an AI assistant", category: "ai" },
  "speech-to-text": { description: "Dictate text by voice", category: "ai" },
  "voice-assistant": { description: "A system voice assistant", category: "ai" },

  // Gaming
  "game-store": { description: "Buy and install games", category: "gaming" },
  "game-launcher": { description: "Launch and organise a game library", category: "gaming" },
  "games": { description: "A game itself", category: "gaming" },
  "game-streaming-client": {
    description: "Play games streamed from another machine",
    category: "gaming",
  },
  "game-streaming-host": { description: "Stream games to another machine", category: "gaming" },
  "windows-compatibility": {
    description: "Run Windows software on another OS",
    category: "gaming",
  },
  "game-overlay": { description: "In-game capture and performance overlay", category: "gaming" },

  // Security and privacy
  "password-manager": { description: "Store and fill passwords", category: "security" },
  "vpn": { description: "Route traffic through a VPN", category: "security" },
  "mesh-vpn": { description: "Connect your own machines privately", category: "security" },
  "encryption": { description: "Encrypt files or volumes", category: "security" },
  "firewall": { description: "Block unsolicited incoming connections", category: "security" },
  "system-hardening": {
    description: "Reduce the attack surface of the system",
    category: "security",
  },
  "ssh": { description: "Connect to machines over SSH", category: "security" },
  "biometric-auth": { description: "Sign in with a fingerprint or face", category: "security" },
  "automatic-updates": { description: "Apply security updates unattended", category: "security" },
  "telemetry-collection": {
    description: "Report usage or hardware data to a vendor",
    category: "privacy",
  },
  "tracker-blocking": { description: "Block analytics and ad domains", category: "privacy" },
  "dns-privacy": { description: "Encrypt DNS queries", category: "privacy" },
  "location-services": {
    description: "Share the machine's location with apps",
    category: "privacy",
  },
  "screen-recall": { description: "Continuously record what is on screen", category: "privacy" },
  "advertising": { description: "Show ads or upsells in the product", category: "privacy" },
  "feedback-reporting": {
    description: "Send feedback and diagnostics to a vendor",
    category: "privacy",
  },

  // System
  "system-monitoring": {
    description: "Watch CPU, memory, disk and network use",
    category: "system-utilities",
  },
  "gpu-tuning": {
    description: "Set GPU fan curves, clocks and power limits",
    category: "system-utilities",
  },
  "package-management": {
    description: "Install software from a package system",
    category: "system-utilities",
  },
  "app-storefront": {
    description: "Browse and install apps from a store",
    category: "system-utilities",
  },
  "sandbox-permissions": {
    description: "Review and edit app sandbox permissions",
    category: "security",
  },
  "desktop-extensions": { description: "Extend the desktop shell", category: "quality-of-life" },
  "remote-desktop": {
    description: "Control another machine's desktop",
    category: "system-utilities",
  },
  "remote-assistance": {
    description: "Let someone else help on this machine",
    category: "system-utilities",
  },
  "phone-integration": { description: "Link a phone to the desktop", category: "system-utilities" },
  "network-scanning": {
    description: "Scan a network for hosts and ports",
    category: "system-utilities",
  },
  "document-scanning": { description: "Scan paper documents", category: "system-utilities" },
  "device-management": { description: "Configure peripherals", category: "system-utilities" },
  "macro-keypad": { description: "Drive a macro keypad", category: "system-utilities" },
  "link-routing": { description: "Choose which app opens a link", category: "quality-of-life" },
  "desktop-appearance": {
    description: "Change how the desktop looks",
    category: "quality-of-life",
  },
  "input-configuration": {
    description: "Configure keyboard, mouse and trackpad",
    category: "quality-of-life",
  },
  "power-management": {
    description: "Control power and performance profiles",
    category: "system-utilities",
  },
  "memory-management": {
    description: "Tune swap and memory behaviour",
    category: "system-utilities",
  },
  "boot-behavior": {
    description: "Control shutdown and startup behaviour",
    category: "system-utilities",
  },
  "shell-configuration": {
    description: "Configure the command-line shell",
    category: "quality-of-life",
  },
  "desktop-automation": { description: "Automate desktop tasks", category: "productivity" },
  "mixed-reality": { description: "Use a VR or mixed-reality headset", category: "media" },
  "help-support": { description: "Built-in help and support", category: "system-utilities" },
  "clock-timers": { description: "Alarms, timers and world clocks", category: "productivity" },
  "ambient-sound": { description: "Play background ambience for focus", category: "productivity" },
} as const;

export type Capability = keyof typeof CAPABILITIES;

export const CAPABILITY_NAMES = Object.keys(CAPABILITIES) as Capability[];

export function isCapability(value: string): value is Capability {
  return Object.hasOwn(CAPABILITIES, value);
}

/**
 * The category a capability belongs to.
 *
 * Categories describe *capabilities*, not software — which is what they were always really
 * describing. An entry lands in a category because of what it does, so "which category does Steam
 * go in?" stops being an argument and starts being derived: it provides game-store and
 * game-launcher, both gaming, so it is gaming. Software that does several unrelated things
 * legitimately appears under each.
 */
export function capabilityCategory(capability: Capability): string {
  return CAPABILITIES[capability].category;
}

/**
 * Every category implied by a set of capabilities, deduplicated, **in declaration order**.
 *
 * Not sorted, and that matters: the first entry is the category the interface files the entry
 * under, and an alphabetical sort makes that choice meaningless. Brave declares
 * `["web-browsing", "tracker-blocking", "ai-chat", ...]` — it is a browser that also has AI chat,
 * not an AI tool that also browses — but sorting filed it under `ai`, where nobody looking for a
 * browser would find it. The first capability an author lists is their statement of what the
 * software *is*, so it decides.
 */
export function categoriesFor(capabilities: readonly Capability[]): string[] {
  return [...new Set(capabilities.map(capabilityCategory))];
}

/** Every category any capability belongs to. */
export const CATEGORIES: string[] = [
  ...new Set(Object.values(CAPABILITIES).map((c) => c.category)),
].sort();
