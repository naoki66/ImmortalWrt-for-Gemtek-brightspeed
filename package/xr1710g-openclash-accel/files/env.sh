# Policy for the bundled Mihomo package-private Go AES-GCM overlay.
# auto still enforces AN7581, CPU, record-size and per-key self-test gates.
case "$(uci -q get xr1710g_crypto.main.mode)" in
	off) MIHOMO_EIP93=off ;;
	*) MIHOMO_EIP93=auto ;;
esac
export MIHOMO_EIP93
