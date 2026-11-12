/**
 * danikuse-commands: slash commands that wake the agent on one Danikuse surface.
 * Each handler queues one followup prompt telling the agent to load the
 * matching surface skill and do the work. No model message is created by the
 * command itself; the followup becomes the next user turn.
 */

export const inject = ["commands"];

const COMMANDS = [
  {
    name: "danikuse",
    skill: "danikuse",
    description: "Danikuse index: browser or desktop work, surface chosen from your words",
    hint: "<задача>",
    task: "read the danikuse index skill, pick the surface its table names for this task (/danikuse-my, /danikuse-agent, or /danikuse-desktop), load that surface skill, then do the work",
  },
  {
    name: "danikuse-my",
    skill: "danikuse-my",
    description: "Do it in my Brave: my tabs, my logins, always visible",
    hint: "<задача в моём браузере>",
    task: "do the work in the user's own Brave",
  },
  {
    name: "danikuse-agent",
    skill: "danikuse-agent",
    description: "Do it in the agent browser (visible; say «в фоне» for background)",
    hint: "<задача в браузере агента>",
    task: "do the work in the agent's own browser",
  },
  {
    name: "danikuse-desktop",
    skill: "danikuse-desktop",
    description: "Do it on the computer with a visible cursor",
    hint: "<задача на компьютере>",
    task: "do the work on the Windows desktop with a visible cursor",
  },
];

export function apply(ctx) {
  const disposes = [];
  for (const cmd of COMMANDS) {
    disposes.push(
      ctx.commands.register({
        name: cmd.name,
        description: cmd.description,
        input: { hint: cmd.hint },
        handler: ({ agent, rawInput }) => {
          const input = (rawInput || "").trim();
          agent.followup({
            content: [
              {
                type: "text",
                text:
                  `Load the ${cmd.skill} skill, then ${cmd.task}` +
                  (input ? `: ${input}` : "") +
                  `. Follow the skill instructions exactly and report evidence paths.`,
              },
            ],
            source: { kind: "user" },
          });
          return { kind: "success", text: `Danikuse task queued: /${cmd.name}` };
        },
      }),
    );
  }
  return () => {
    for (const d of disposes) {
      try {
        d();
      } catch {
        /* ignore */
      }
    }
  };
}
