import type { AppSession } from '@mentra/sdk';
import type { User } from '../../shared/class/User';

/**
 * Sets up device state change listeners (WiFi, battery, model)
 * @param session The app session
 * @param userId The user ID
 * @param user The User instance
 */
export function setupDeviceStateListeners(
  session: AppSession,
  userId: string,
  user: User
): void {
  // WiFi connected status
  session.device.state.wifiConnected.onChange((connected) => {
    console.log(`[${userId}] WiFi status:`, connected);
    user.updateWifiConnected(connected);
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });

  // Battery level
  session.device.state.batteryLevel.onChange((level) => {
    console.log(`[${userId}] Battery:`, level, "%");
    user.updateBatteryLevel(level);
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });

  // Model name
  session.device.state.modelName.onChange((model) => {
    console.log(`[${userId}] Model:`, model);
    user.updateModelName(model);
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });

  // WiFi SSID
  session.device.state.wifiSsid.onChange((ssid) => {
    console.log(`[${userId}] WiFi SSID changed to:`, ssid);
    user.updateWifiSsid(ssid);
    console.log(`[${userId}] Updated glass state:`, user.getGlassState());
  });
}
