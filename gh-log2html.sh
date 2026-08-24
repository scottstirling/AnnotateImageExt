#!/bin/sh
# gh login
gh api repos/:owner/:repo/commits -q '.[0:25] | [ "<ul>", (.[] | "  <li>\(.commit.message)</li>"), "</ul>" ] | join("\n")'
