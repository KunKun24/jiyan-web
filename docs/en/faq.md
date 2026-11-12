# FAQ

**Why is the admin console missing?**
Only the user-facing frontend is open source. The admin console, server code, database schema and signing keys are out of scope.

**Can I host it on my own domain?**
Yes, but it must share the origin with the API (same domain or a same-origin reverse proxy), because sign-in and the cloud panel depend on HttpOnly cookies.

**Can I deploy to GitHub Pages?**
The static site loads, but API calls fail without same-origin cookies. Put a same-origin proxy in front instead of changing the frontend.

**Is the ENV transport encrypted?**
No. It is a byte-wise encoding for legacy compatibility; security comes from HTTPS and server-side sessions.

**What happens when I unbind a card?**
The device binding is cleared and, depending on the app settings, unbind count or card duration may be reduced. Only do it when necessary.

**Why does the cloud panel say I need a membership?**
Cloud control is a membership feature; the account also needs to own the app.

**Can I use it commercially?**
Yes, under AGPL-3.0. If you offer a modified version as a network service, you must publish the corresponding source. The name and logo are not licensed.
