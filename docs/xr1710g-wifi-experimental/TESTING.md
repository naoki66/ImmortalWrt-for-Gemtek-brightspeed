# Validation plan

Build XR1710G with the normal upstream feed locks/config and this series.
Run the full image build and inspect FIT/DTB, kernel config and installed mt76
modules. Confirm the original partition map is unchanged. This review series
does not replace bootloader, calibration EEPROM, MT7996 firmware or NPU firmware.

Before each run capture release, boot ID, actual PCIe speed/width, PHY lock/IDAC
output, wireless/NPU runtime state and Wi-Fi/client driver configuration.
Use persistent, bounded full logread and kernel snapshots on the router,
alongside client iperf JSON, ping and WLAN events. Do not rely only on SSH streaming.

Compare one group at a time against the same baseline/client/configuration.
For PCIe specifically split Gen2-only from IDAC/secondary analog setup in follow-up
tests: the combined first commit cannot identify which component changes behavior.
Run single-direction and bidirectional unlimited TCP; then 2.4/5/6 GHz for at
least 7200 seconds each with four streams per direction. Record receiver mean,
interval min/peak, transferred bytes, reconnects and all failed attempts.
Router-local iperf tests do not validate external wired-peer NPU forwarding.

Do not automatically restart wireless/router on failure. Recover the persistent
logs first. Mark MCU timeout, PCIe AER/CmpltTO, firmware init failures, reset failures
and boot ID changes. Report failed or interrupted runs rather than only throughput.

Rollback: revert commits in reverse order on an otherwise clean branch, or apply
the exported rollback.patch with git apply --check then git apply. Git/source
rollback is separate from flashing a rollback image. No hardware flashing or
network changes are performed by this submission preparation.
