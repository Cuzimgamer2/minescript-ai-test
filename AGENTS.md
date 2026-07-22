# Minescript Development Rules

- **Strict Import Matching:** Always verify that imported function names match exactly what is called in the code.
- **Efficiency:** Use `get_block_region` for scanning areas. Never use loops of individual block calls (`get_block`) for region scanning. if minescript or minescript_plus is used, just import them at the top without from but directly: "import minescript" and "import minescript_plus"
- **No Code Comments:** DO NOT include any code comments in the generated script. Keep it purely functional, clean, and uncommented unless explicitly requested.
