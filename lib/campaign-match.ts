// Notion's "Campagne" tags and the app's campaign names are entered
// separately (one in Notion, one in Settings) and can drift — e.g. a Notion
// tag "One-shot" vs a campaign named "One-Shot", or a tag missing a suffix
// the campaign name has. Match loosely instead of requiring an exact string.

function normalizeCampaignValue(value: string): string {
  return value.trim().toLowerCase()
}

export function characterMatchesCampaign(
  character: { campaigns?: string[] },
  campaignName: string
): boolean {
  const tags = character.campaigns
  if (!tags || tags.length === 0) return true // untagged characters show in every campaign

  const normalizedCampaign = normalizeCampaignValue(campaignName)
  return tags.some((tag) => {
    const normalizedTag = normalizeCampaignValue(tag)
    return (
      normalizedTag === normalizedCampaign ||
      normalizedCampaign.includes(normalizedTag) ||
      normalizedTag.includes(normalizedCampaign)
    )
  })
}
