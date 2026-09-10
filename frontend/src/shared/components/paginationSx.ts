import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Shared look for the MUI `<Pagination>` used in the catalogue and the admin panel.
 *
 * MUI carries its own palette and knows nothing about the `dark` class Tailwind
 * toggles on `<html>`, so an unstyled pager paints near-black digits
 * (`rgba(0,0,0,0.87)`) on the dark background and highlights the current page in
 * MUI's default blue. `inherit` hands the colour back to the surrounding Tailwind
 * text colour, which already flips with the theme, and the brand variables keep
 * the selected page on-brand in both themes.
 */
export const paginationSx: SxProps<Theme> = {
    "& .MuiPaginationItem-root": {
        fontFamily: "inherit",
        color: "inherit",
    },
    "& .MuiPaginationItem-root:hover": {
        backgroundColor: "color-mix(in srgb, var(--uned-primary) 22%, transparent)",
    },
    "& .MuiPaginationItem-root.Mui-selected": {
        backgroundColor: "var(--uned-primary)",
        color: "#fff",
    },
    "& .MuiPaginationItem-root.Mui-selected:hover": {
        backgroundColor: "var(--uned-primary-hover)",
    },
};
