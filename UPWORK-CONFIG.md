# UpWork API Configuration

## OAuth Configuration

**Redirect URI for UpWork OAuth App:**
```
http://home.alcorn.dev:8947/oauth/callback
```

## Webhook Configuration

**Webhook URL for UpWork messaging:**
```
http://home.alcorn.dev:8947/webhooks/upwork
```

## Required Network Configuration

### Router Firewall Rule
- **Port**: 8947
- **Protocol**: TCP
- **Direction**: Inbound
- **Source**: UpWork IP ranges (or Any for initial testing)
- **Destination**: Your router's external IP
- **Forward to**: Development machine's local IP:8947

### DNS Configuration
Ensure `home.alcorn.dev` resolves to your router's external IP address.

## Local Development

### Start Daemon
```bash
npm run daemon start
```

### Check Status
```bash
npm run daemon status
```

### Test OAuth Flow
```bash
npm run dev
```

## Security Notes

1. **Port 8947** is chosen from the user port range (1024-65535) to avoid conflicts
2. **HTTP is acceptable** for OAuth callbacks as UpWork handles the security layer
3. **Firewall rules** should be configured to allow only necessary traffic
4. **Domain-based callback** is more professional than IP-based callbacks

## Endpoints Summary

| Endpoint | Local | Public (UpWork Config) |
|----------|-------|------------------------|
| OAuth Callback | `http://localhost:8947/oauth/callback` | `http://home.alcorn.dev:8947/oauth/callback` |
| Webhooks | `http://localhost:8947/webhooks/upwork` | `http://home.alcorn.dev:8947/webhooks/upwork` |
| Health Check | `http://localhost:8947/health` | `http://home.alcorn.dev:8947/health` |
| Status | `http://localhost:8947/status` | `http://home.alcorn.dev:8947/status` |