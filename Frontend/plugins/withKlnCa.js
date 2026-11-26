// Expo-Config-Plugin: Die Android-App vertraut der eigenen MakerLab-CA (Frontend/certs/kln-ca.pem).
//
// Hintergrund: Der Pi spricht nur HTTPS. Sein Zertifikat stammt von der eigenen CA, die
// Backend/deploy/make-certs.sh erzeugt. Android vertraut Apps gegenüber standardmäßig nur
// System-CAs, deshalb wird die CA hier fest in die App eingebaut, und zwar NUR für diese App.
// Unverschlüsseltes HTTP bleibt in Release-Builds verboten. Debug-Builds dürfen HTTP (Metro, Simulation).
//
// iOS: Dort gibt es keine App-eigene Vertrauensliste. Die CA wird einmal als Profil installiert,
// siehe DOKU.md, Abschnitt 3 K.
const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");

const CA_FILE = path.join("certs", "kln-ca.pem");

const releaseConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/kln_ca" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const debugConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/kln_ca" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function withKlnCa(config) {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const caPath = path.join(cfg.modRequest.projectRoot, CA_FILE);
      if (!fs.existsSync(caPath)) {
        throw new Error(
          `withKlnCa: ${CA_FILE} fehlt. Erst "bash Backend/deploy/make-certs.sh <IP des Pi>" ausführen.`,
        );
      }
      const appDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
      );
      const write = (rel, content) => {
        const file = path.join(appDir, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      };
      write(
        path.join("main", "res", "raw", "kln_ca.pem"),
        fs.readFileSync(caPath),
      );
      write(
        path.join("main", "res", "xml", "network_security_config.xml"),
        releaseConfig,
      );
      write(
        path.join("debug", "res", "xml", "network_security_config.xml"),
        debugConfig,
      );
      return cfg;
    },
  ]);

  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return cfg;
  });
}

module.exports = withKlnCa;
