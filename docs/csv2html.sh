#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <input.csv> [caption]" >&2
    exit 1
fi

CSV_FILE="$1"
CAPTION="${2:-Data Table Overview}"

cat << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${CAPTION}</title>
    <style>
        body { font-family: sans-serif; margin: 30px; background: #f9f9f9; color: #333; }
        table { border-collapse: collapse; width: 100%; background: #fff; }
        caption { font-size: 1.5em; font-weight: bold; margin-bottom: 10px; text-align: left; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background: #f2f2f2; cursor: pointer; user-select: none; position: relative; padding-right: 25px; }
        th::after { content: " ↕"; color: #aaa; position: absolute; right: 8px; }
        th.asc::after { content: " ▲"; color: #00f; }
        th.desc::after { content: " ▼"; color: #00f; }
        tr:nth-child(even) { background: #fcfcfc; }
    </style>
</head>
<body>

<table>
    <caption>${CAPTION}</caption>
EOF

awk '
function print_row(tag, line) {
    print "        <tr>"
    line = line ","
    while (length(line) > 0) {
        if (match(line, /^"[^"]*"/)) {
            val = substr(line, RSTART + 1, RLENGTH - 2)
            line = substr(line, RSTART + RLENGTH + 1)
        } else {
            match(line, /[^,]*/)
            val = substr(line, RSTART, RLENGTH)
            line = substr(line, RSTART + RLENGTH + 1)
        }
        gsub(/\r/, "", val)
        print "            <" tag ">" val "</" tag ">"
    }
    print "        </tr>"
}

BEGIN { print "    <thead>" }
NR==1 { print_row("th", $0); print "    </thead>\n    <tbody>"; next }
      { print_row("td", $0) }
END   { print "    </tbody>" }' "$CSV_FILE"

cat << 'EOF'
</table>

<script>
document.querySelectorAll('th').forEach((th, idx) => {
    th.addEventListener('click', () => {
        const tbody = th.closest('table').querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const isAsc = !th.classList.contains('asc');
        
        // Pure natural alphanumeric sorting (handles text and numbers seamlessly)
        rows.sort((a, b) => {
            const tA = a.children[idx] ? a.children[idx].innerText.trim() : '';
            const tB = b.children[idx] ? b.children[idx].innerText.trim() : '';
            return tA.localeCompare(tB, undefined, {numeric: true, sensitivity: 'base'}) * (isAsc ? 1 : -1);
        });
        
        rows.forEach(tr => tbody.appendChild(tr));
        
        // Reset header arrow classes
        th.closest('tr').querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc'));
        th.classList.add(isAsc ? 'asc' : 'desc');
    });
});
</script>

</body>
</html>
EOF
