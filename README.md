# opencode-caveman

OpenCode plugin that activates [caveman](https://github.com/JuliusBrussee/caveman) token-compression automatically on every session. Terse responses. Full technical accuracy.

## Install

    opencode plugin opencode-caveman        # project-level
    opencode plugin -g opencode-caveman     # global

Caveman is active from the next session. No config required.

## Commands

| Command | Description |
|---------|-------------|
| `/caveman [lite|full|ultra|wenyan]` | Set compression level |
| `/caveman-commit` | Terse commit message for staged changes |
| `/caveman-review` | Terse code review of current diff |

## Skill

Load caveman instructions on demand:

    use skill caveman

## Levels

| Level | Style |
|-------|-------|
| lite | No filler, full sentences |
| **full** (default) | Fragments, no articles |
| ultra | Abbreviations, arrows for causality |
| wenyan-full | Classical Chinese (文言文) |

## Uninstall

Remove `opencode-caveman` from your `opencode.json` plugin list, then:

    npm uninstall opencode-caveman

## Credits

Compression rules from [juliusbrussee/caveman](https://github.com/JuliusBrussee/caveman).
