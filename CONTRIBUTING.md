# Contributing to SUBTools

Thank you for your interest in contributing to the **SUBTools** project! We welcome bug fixes, performance optimizations, accessibility enhancements, and new student-oriented features.

---

## Code of Conduct & Fair Play

- **Respect Intellectual Property**: All contributions must be your original work or permissibly licensed.
- **Strictly Non-Commercial**: This repository is published under the [SUBTools Community Source & Non-Commercial License](LICENSE). Contributions submitted here will be distributed under these terms.
- **Protect Infrastructure & Privacy**: Never commit private keys, credentials, student IDs, personal phone numbers, or tokens.

---

## Getting Started

1. **Fork the Repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/SUBTools.git
   cd SUBTools
   ```
3. **Create a topic branch**:
   ```bash
   git checkout -b feature/my-cool-feature
   # or
   git checkout -b fix/routine-render-bug
   ```

---

## Development & Testing Workflow

### Web Portal (`SUBAdmin`)
- Make sure you are using Node.js v18 or v20+.
- Create a `.env` file from `.env.example`.
- Run development server:
  ```bash
  cd SUBAdmin
  npm install
  npm run dev
  ```
- Before creating a PR, ensure the build passes cleanly:
  ```bash
  npm run build
  ```

### Mobile App (`SUBMobile`)
- Android Studio Koala / Ladybug or newer.
- Gradle Wrapper and JDK 17.
- Copy `secrets.properties.example` to `secrets.properties` in `SUBMobile/`.
- Do not check in build artifacts (`.apk`, `.aab`, `build/`).

---

## Pull Request Guidelines

1. **Atomic Commits**: Write clear, descriptive commit messages:
   - `fix: resolve mobile navbar drawer toggle`
   - `feat: add filter for archived exam notices`
2. **No Secrets**: Double-check `git status` and `git diff` to guarantee no personal `.env` or credentials slipped in.
3. **Open a Pull Request**:
   - Provide a clear summary of what your PR changes.
   - Attach screenshots or screen recordings for any UI changes.
   - Reference any related issues or discussions.

---

Thank you for helping make SUBTools better for everyone!
