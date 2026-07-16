local m, s, o
local sys = require "luci.sys"
local uci = require("luci.model.uci").cursor()

local function get_interface_list()
    local ifaces = {}
    uci:foreach("network", "interface", function(s)
        if s[".name"] ~= "loopback" and s.proto then
            if s.device then
                ifaces[#ifaces + 1] = s.device
            end
        end
    end)
    table.sort(ifaces)
    return ifaces
end

m = Map("clientstatus", translate("Client Management Settings"),
	translate("Note: Restart the service if the page does not display correctly after changing network settings."))
s = m:section(TypedSection, "clientstatus", translate("General Settings"))
s.anonymous = true
s.addremove = false

o = s:option(Flag, "enabled", translate("Enable"),
	translate("Enable or disable the client status monitoring service."))
o.default = "0"
o.rmempty = false

o = s:option(Value, "interval", translate("Refresh Interval (seconds)"),
	translate("How often to scan all clients. Default: 30 seconds."))
o.default = "30"
o.datatype = "and(uinteger,min(20))"
o.rmempty = false


o = s:option(ListValue, "lan_iface", translate("LAN Interface"),
	translate("Network interface to scan for clients. Usually br-lan."))
o.widget = "select"

local ifaces = get_interface_list()
for _, iface in ipairs(ifaces) do
	o:value(iface)
end
o.default = "br-lan"

return m
