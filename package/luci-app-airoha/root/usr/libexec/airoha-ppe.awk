# Parse the kernel's whitespace-separated FOE debugfs records.
function quote(s,    out, i, c) {
	out = "\""
	for (i = 1; i <= length(s); i++) {
		c = substr(s, i, 1)
		if (c == "\\" || c == "\"") out = out "\\"
		out = out c
	}
	return out "\""
}
function field(name,    i, pos) {
	for (i = 4; i <= NF; i++) {
		pos = index($i, "=")
		if (pos && substr($i, 1, pos - 1) == name)
			return substr($i, pos + 1)
	}
	return ""
}
function counter(name,    value) {
	value = field(name)
	# Preserve 64-bit values without floating-point rounding.
	return value ~ /^[0-9]+$/ ? quote(value) : "null"
}
BEGIN { total = shown = n4 = n6 = l2b = bnd = unb = fin = 0 }
# Some kernel versions expose only the bound count in ppe/bind.
NF == 1 && $1 ~ /^[0-9]+$/ && (state_filter == "" || state_filter == "BND") {
	total += $1
	bnd += $1
	next
}
$1 ~ /^[0-9a-fA-F]+$/ && $2 ~ /^(BND|UNB|FIN|INV)$/ {
	if (state_filter != "" && $2 != state_filter) next
	total++
	if ($2 == "BND") bnd++
	if ($2 == "UNB") unb++
	if ($2 == "FIN") fin++
	type = $3
	proto = ""
	if (type == "IPv4") n4++
	if (type == "IPv6") n6++
	if (type == "L2B") l2b++
	if ((type == "IPv4" || type == "IPv6") && $4 ~ /^[35]T$/) proto = $4
	if (shown >= limit) next
	shown++
	entry[shown] = sprintf("{\"index\":%s,\"state\":%s,\"type\":%s,\"proto\":%s,\"orig\":%s,\"new_flow\":%s,\"eth\":%s,\"etype\":%s,\"vlan\":%s,\"packets\":%s,\"bytes\":%s}",
		quote($1), quote($2), quote(type), quote(proto), quote(field("orig")),
		quote(field("new")), quote(field("eth")), quote(field("etype")),
		quote(field("vlan")), counter("packets"), counter("bytes"))
}
END {
	printf "{\"available\":true,\"total\":%d,\"ipv4\":%d,\"ipv6\":%d,\"l2b\":%d,\"bound\":%d,\"unbound\":%d,\"finished\":%d,\"truncated\":%s,\"entries\":[",
		total, n4, n6, l2b, bnd, unb, fin, (total > shown ? "true" : "false")
	for (i = 1; i <= shown; i++) {
		if (i > 1) printf ","
		printf "%s", entry[i]
	}
	printf "]}"
}
