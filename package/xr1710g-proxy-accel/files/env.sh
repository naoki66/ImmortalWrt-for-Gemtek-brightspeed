# Shared policy for the package-private Mihomo and Xray Go overlays.
# auto still enforces the overlay's AN7581/CPU/self-test restrictions.
case "$(uci -q get xr1710g_crypto.main.mode)" in
	off) MIHOMO_EIP93=off; XRAY_EIP93=off ;;
	*) MIHOMO_EIP93=auto; XRAY_EIP93=auto ;;
esac
export MIHOMO_EIP93 XRAY_EIP93
