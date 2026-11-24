# Frontend deployment

Set `NEXT_PUBLIC_API_URL` to the public backend origin and set `NEXT_PUBLIC_USE_MOCKS=false`.

```text
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_USE_MOCKS=false
```

The backend must add CORS middleware for the exact frontend origin:

```text
allow_origins=[https://frontend.example.com]
allow_credentials=true
allow_methods=[GET, POST, OPTIONS]
allow_headers=[Authorization, Content-Type, Accept]
```

Do not use wildcard origins with bearer credentials. The backend currently needs CORS middleware and an audit-chain verification route if the verify control is to be functional. Demo credentials are fixed keys or signed bearer tokens; never persist credentials in localStorage.
