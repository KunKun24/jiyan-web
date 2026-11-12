# Security

The public copy removes the inline SQL from the console, routes backend paths through `_backend.php`, replaces the admin API path with `/api/console/api.php`, and ships no credentials, signing keys or server IPs. Deployers must map the console API, set their own signature salt and replace download URLs.
