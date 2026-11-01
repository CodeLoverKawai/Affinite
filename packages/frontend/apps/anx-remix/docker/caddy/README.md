# Docker Caddy Reverse Proxy for Anx Remix

This folder contains the configuration to set up a Caddy reverse proxy for Ollama, Voicebox, and WebDAV with automated HTTPS SSL certificates.

## Getting Started
1. Edit the environment variables in `docker-compose.yml` or set them:
   * `DOMAIN`: Your public DDNS domain (e.g. `my-remix.duckdns.org` or `desec.io`).
   * `SSL_EMAIL`: Email for Let's Encrypt certificates.
2. Run:
   ```bash
   docker compose up -d
   ```
3. Ensure port `80` and `443` are open on your router if you are using Let's Encrypt HTTP challenge.

## Local DNS or Zero-Trust VPN
If you want to use this inside a Zero-Trust VPN like Tailscale:
* Set `DOMAIN` to your Tailscale tailnet machine name (e.g. `my-machine.tailnet-name.ts.net`).
* Ensure Caddy has access to the host machine.
