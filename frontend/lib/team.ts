export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  image?: string;
}

export const synforgeTeam: TeamMember[] = [
  { name: "Team Member One", role: "Role / placeholder", initials: "TM" },
  { name: "Team Member Two", role: "Role / placeholder", initials: "TM" },
  { name: "Team Member Three", role: "Role / placeholder", initials: "TM" },
];
