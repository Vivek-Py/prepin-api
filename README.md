## PrepInTech API

Backend API for PrepInTech utilizes nodeJS, socket.io and MongoDB. Also connects with golang rtc token creation server.

## Paths

### Users

- /users (GET)
- /users/:id (GET)
- /users (POST)
- /users/register (POST)
- /users/login (POST)

### Schedule

- /schedule (GET)
- /schedule/:id (POST)
- /schedule/user (PATCH)

### Verification and Token

- /verify (GET)
- /token (GET)

