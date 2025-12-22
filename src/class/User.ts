export interface GlassState {
  wifiConnected: boolean | null;
  wifiSsid: string | null;
  batteryLevel: number | null;
  modelName: string | null;
}

export class User {
  userID: string;
  glassState: GlassState;

  constructor(userID: string) {
    this.userID = userID;
    this.glassState = {
      wifiConnected: null,
      wifiSsid: null,
      batteryLevel: null,
      modelName: null,
    };
  }

  /**
   * Update the WiFi connection state
   */
  updateWifiConnected(connected: boolean): void {
    this.glassState.wifiConnected = connected;
  }

  /**
   * Update the WiFi SSID
   */
  updateWifiSsid(ssid: string | null): void {
    this.glassState.wifiSsid = ssid;
  }

  /**
   * Update the battery level
   */
  updateBatteryLevel(level: number): void {
    this.glassState.batteryLevel = level;
  }

  /**
   * Update the model name
   */
  updateModelName(model: string): void {
    this.glassState.modelName = model;
  }

  /**
   * Update multiple state properties at once
   */
  updateGlassState(updates: Partial<GlassState>): void {
    if (updates.wifiConnected !== undefined) {
      this.glassState.wifiConnected = updates.wifiConnected;
    }
    if (updates.wifiSsid !== undefined) {
      this.glassState.wifiSsid = updates.wifiSsid;
    }
    if (updates.batteryLevel !== undefined) {
      this.glassState.batteryLevel = updates.batteryLevel;
    }
    if (updates.modelName !== undefined) {
      this.glassState.modelName = updates.modelName;
    }
  }

  /**
   * Get the current glass state
   */
  getGlassState(): GlassState {
    return { ...this.glassState };
  }

  /**
   * Get WiFi connection status
   */
  isWifiConnected(): boolean | null {
    return this.glassState.wifiConnected;
  }

  /**
   * Get current battery level
   */
  getBatteryLevel(): number | null {
    return this.glassState.batteryLevel;
  }
}


