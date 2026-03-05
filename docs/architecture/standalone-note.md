# Cursor Drive: Standalone Architecture

Cursor Drive is a standalone extension. There is no hh backend, no Discord integration, no shared core, and no adapter layer. All logic runs in the VS Code extension host or the `.cursor/` plugin layer. The extension is self-contained and does not depend on any external voice gateway, Python services, or multi-repo coordination.
