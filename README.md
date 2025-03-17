# ✨ PasteServer

A 🌟 powerful and efficient server to upload and manage text or code snippets.  
**🌐 Demo**: [https://paste.exbil.net/](https://paste.exbil.net/)

---

## 🚀 Features

- 🔧 **Multiple Storage Options**: Supports `Redis`, `ArangoDB`, or simple file storage.
- ⚙️ **Configurable**: Fully customizable settings for rate limits, document size, and more.
- 📡 **API Integration**: RESTful API to create, read, and delete documents.
- 🛡️ **Rate Limiting**: Prevents abuse with adjustable rate limits.
- 🔄 **Auto Update Support**: Easily keep the server up to date.

---

## 🏁 Getting Started

### 1️⃣ Requirements

- 🖥️ [Node.js](http://www.nodejs.org/)
- Either:
    - 🐏 [Redis](http://www.redis.io/)
    - 🍃 [ArangoDB](http://www.arangodb.com/)
    - 📁 Or use the optional file storage.

---

### 2️⃣ Installation

Clone the repository and install dependencies:

```bash
# 🌀 Clone this repository
git clone https://github.com/efebagri/node-paste-server.git
cd pasteserver

# 📦 Install dependencies using npm
npm install
# OR use Yarn
yarn install
```

---

### 3️⃣ Configuration

Edit the `config.js` file to customize:

- 🖥️ **Server settings**: Port, document-storage type, etc.
- 💾 **Storage settings**: Choose between `file`, `Redis`, or `ArangoDB`.
- 📊 **Rate Limits**: Adjust request limits to prevent abuse.

---

### 4️⃣ Run the Server

Start the server using:

```bash
# ▶️ Start with npm
npm start
```
or
```bash
# ▶️ Start with yarn
yarn start
```

---

## ⚙️ Configuration Details

### 🖥️ Server Section

Configure server settings:

- **port**: Port to run the server on.

---

### 🗄️ Storage Section

Select your storage type and configure its settings:

- **type**: Choose `"file"`, `"redis"`, or `"arangodb"`.
- **host**: Host URL for the storage.
- **port**: Port for the storage.
- 🔑 **password**: Password for the storage (if applicable).
- 👤 **user**: Username for ArangoDB authentication.
- 🗃️ **database**: Database name (only for ArangoDB).
- ⏲️ **documentExpireInMs**: Expiry time for unused documents (only for Redis).
- 📂 **path**: Path to store documents (only for file storage).

---

### ⏱️ Rate Limiting Section

Protect server performance and prevent abuse:

- ⌛ **timeInMs**: Time window (in ms) for requests.
- 🚦 **maxRequestsPerTime**: Maximum allowed requests per time window.

---

### 🔄 AutoUpdate Section

To enable automatic updates:

- ✅ **enabled**: Set to `true` to allow updates.
- 🗂️ **packageJsonURL**: URL to `package.json` of the remote PasteServer.
- 📦 **zipURL**: URL for the zip archive of the update files.
- 📑 **keepFiles**: List of files to keep during updates (e.g., `static/index.html`).

---

## 🔌 API Usage

### ✍️ Create a Document

Send a `POST` request with the plain text in the body.

**Response**:

- ✅ *Success*:
  ```json
  {
    "key": "uniqueKey",
    "deleteSecret": "secretKey"
  }
  ```
- ❌ *Failures*:
    - `400 Bad Request`: Text is missing.
    - `413 Payload Too Large`: Text exceeds limit.
    - `500 Internal Server Error`: Issue while saving.

---

### 📖 Read a Document

Send a `GET` request to `/documents/$key`.

**Response**:

- ✅ *Success*:
  ```json
  {
    "text": "Your saved text"
  }
  ```
- ❌ *Failure*:
    - `404 Not Found`: Document not found.

---

### 🗑️ Delete a Document

Send a `GET` request to `/documents/delete/$key/$deleteSecret`.

**Response**:

- ✅ *Success*: `200 OK`.
- ❌ *Failures*:
    - `400 Bad Request`: Missing delete key.
    - `403 Forbidden`: Invalid key or secret.

---

### 🚦 Rate Limits

Exceeded rate limits respond with:

- ⛔ **Status Code**: `429 Too Many Requests`
- 📄 **Response Body**:
  ```json
  {
    "message": "Rate limit exceeded. Try again later."
  }
  ```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).  
Feel free to use and modify as needed.

---

## 🙏 Credits

This project is based on the original [PasteServer](https://github.com/juliarn/PasteServer)
by [juliarn](https://github.com/juliarn).  
The current version involves enhancements and further development by new contributors.