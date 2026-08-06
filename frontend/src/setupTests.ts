// Añade los matchers de jest-dom (toBeInTheDocument, toHaveValue, ...) a
// los `expect` de Vitest. Se carga automáticamente antes de cada archivo
// de test gracias a `test.setupFiles` en vite.config.ts.
import "@testing-library/jest-dom/vitest";
import "./i18n";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `test.globals` en la config, @testing-library/react no registra su
// limpieza automática del DOM entre tests; lo hacemos explícito aquí para
// que cada `render()` de un test no deje el modal montado para el siguiente.
afterEach(() => {
    cleanup();
});
