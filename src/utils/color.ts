/**
 * A single icon style for categories and accounts across the whole app:
 * a muted fill in the entity color, with the glyph and a thin ring in that same color.
 *
 * A solid fill looked different in light and dark themes and was harder to read,
 * so this helper is used everywhere instead of ad-hoc inline styles.
 */
export function iconTint(color: string): Record<string, string> {
    return {
        background: `${color}24`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}40`,
    };
}
