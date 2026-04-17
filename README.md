# opencode-caveman

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square) [![npm]](https://www.npmjs.com/package/opencode-caveman)

[npm]: https://img.shields.io/npm/v/opencode-caveman.svg?style=flat-square

opencode-caveman is an [OpenCode](https://opencode.ai) plugin that activates [caveman](https://github.com/JuliusBrussee/caveman) token-compression automatically on every session. Terse responses. Full technical accuracy.

## Get started

1. Install opencode-caveman:

    **Project-level:**
    ```bash
    opencode plugin opencode-caveman
    ```

    **Global:**
    ```bash
    opencode plugin -g opencode-caveman
    ```

2. Navigate to your project directory and run `opencode`.

Caveman is active from the next session. No config required.

## Commands

| Command | Description |
|---------|-------------|
| `/caveman [lite\|full\|ultra\|wenyan-lite\|wenyan-full\|wenyan-ultra]` | Set compression level |
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
| wenyan-lite | Semi-classical Chinese register |
| wenyan-full | Classical Chinese (文言文) |
| wenyan-ultra | Extreme compression, classical feel |

## Uninstall

Remove `opencode-caveman` from your `opencode.json` plugin list, then:

```bash
npm uninstall opencode-caveman
```

## Reporting Bugs

Use the `/bug` command to report issues directly within OpenCode, or file a [GitHub issue](https://github.com/DxVapor/opencode-caveman/issues).

## Troubleshooting

**Skills or commands not showing up?**

OpenCode caches plugin packages. If you updated from an older version, the cache may still have the old copy. Clear it and restart:

```sh
rm -rf ~/.cache/opencode/packages/opencode-caveman@*
```

If the skill/command files were written by a previous broken version, remove them too so they get rewritten on next startup:

```sh
rm -f ~/.config/opencode/skills/caveman/SKILL.md
rm -f ~/.config/opencode/command/caveman.md
rm -f ~/.config/opencode/command/caveman-commit.md
rm -f ~/.config/opencode/command/caveman-review.md
```

Then restart OpenCode.

**Config dir in a non-default location?**

If your OpenCode config is not at `~/.config/opencode`, set `OPENCODE_CONFIG_DIR` to the correct path before starting OpenCode. The plugin reads this env var to know where to install its files.

## Credits

Compression rules from [juliusbrussee/caveman](https://github.com/JuliusBrussee/caveman).
