/**
 * Shared tool categorization utility.
 * Splits tool IDs into skill IDs and MCP tool IDs by checking against backend caches.
 */

let skillsCache: Array<{ id: string }> = [];
let mcpCache: Array<{ id: string }> = [];

export function updateToolCaches(skills: Array<{ id: string }>, mcp: Array<{ id: string }>) {
  skillsCache = skills;
  mcpCache = mcp;
}

export function splitTools(selectedTools: string[]): {
  inject_skills?: string[];
  mcp_tools?: string[];
  tools?: string[];
} {
  if (!selectedTools || selectedTools.length === 0) return {};

  const skillSet = new Set(skillsCache.map((s) => s.id).filter(Boolean));
  const mcpSet = new Set(mcpCache.map((m) => m.id).filter(Boolean));

  const skillIds = selectedTools.filter((id) => skillSet.has(id));
  const mcpIds = selectedTools.filter((id) => mcpSet.has(id));

  const result: ReturnType<typeof splitTools> = {};
  if (skillIds.length > 0) result.inject_skills = skillIds;
  if (mcpIds.length > 0) result.mcp_tools = mcpIds;
  if (skillIds.length === 0 && mcpIds.length === 0) result.tools = selectedTools;

  return result;
}

/** Initialize caches from API calls (call once on app load). */
export async function initToolCaches(
  getSkillsFn: () => Promise<Array<{ id: string }>>,
  getMcpServersFn: () => Promise<Array<{ id: string }>>
): Promise<void> {
  try {
    const [skills, mcp] = await Promise.all([
      getSkillsFn().catch(() => []),
      getMcpServersFn().catch(() => []),
    ]);
    updateToolCaches(skills, mcp);
  } catch {
    // silently fail
  }
}
