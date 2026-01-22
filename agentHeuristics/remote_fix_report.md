# Bug Report: Remote Save Failure (Secure Context & Networking)

**User Reported Issue**: "i cant save from another pc not in my network"

**Culprit Identified**: 🔒 **Secure Context Constraint** & 🌐 **Networking Ambiguity**
1.  **Secure Context**: The frontend used `crypto.randomUUID()`, which is **disabled** by browsers in non-secure (`http`) contexts. When accessing from a remote PC over plain HTTP, the save button would simply crash silently or show a JS error.
2.  **Host Resolution**: On macOS, `localhost` can sometimes resolve to IPv6 (`::1`), while Express might be listening on IPv4. This causes intermittent proxy failures.

**Fix Applied**:
- **Robust ID Generation**: Added a fallback for UUID generation that works in non-secure (`http`) environments.
- **Network Standardization**: Switched all Vite proxy targets from `localhost` to `127.0.0.1` for guaranteed IPv4 routing.
- **Server Transparency**: Added server-side logging for incoming save requests to verify connection arrival.

**Verification**:
Please restart the server on your Mac. When you click "Save" on the remote PC, you should see log output on the Mac terminal.
