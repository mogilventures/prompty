export interface RoomSettings {
  timer: number;
  rounds: number;
  maxPlayers: number;
  aiModel: string;
  contentFilter: boolean;
  profanityFilter: boolean;
  votingTime: number;
  regenerationLimit: number;
}

export interface Preset {
  name: string;
  settings: RoomSettings;
  description: string;
}

export const defaultSettings: RoomSettings = {
  timer: 45,
  rounds: 10,
  maxPlayers: 8,
  aiModel: "flux.dev",
  contentFilter: true,
  profanityFilter: true,
  votingTime: 20,
  regenerationLimit: 2
};

export const presets: Preset[] = [
  {
    name: "Quick Game",
    description: "Fast-paced fun for busy gamers",
    settings: {
      timer: 30,
      rounds: 5,
      maxPlayers: 6,
      aiModel: "flux.schnell",
      contentFilter: true,
      profanityFilter: true,
      votingTime: 15,
      regenerationLimit: 1
    }
  },
  {
    name: "Standard",
    description: "Classic balanced gameplay",
    settings: {
      timer: 45,
      rounds: 10,
      maxPlayers: 8,
      aiModel: "flux.dev",
      contentFilter: true,
      profanityFilter: true,
      votingTime: 20,
      regenerationLimit: 2
    }
  },
  {
    name: "Marathon",
    description: "Extended epic gaming session",
    settings: {
      timer: 60,
      rounds: 20,
      maxPlayers: 12,
      aiModel: "flux.dev",
      contentFilter: false,
      profanityFilter: false,
      votingTime: 30,
      regenerationLimit: 3
    }
  }
];

export function calculateEstimatedDuration(settings: RoomSettings): string {
  const roundTime = settings.timer + settings.votingTime + 15;
  const totalMinutes = Math.ceil((settings.rounds * roundTime) / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}
