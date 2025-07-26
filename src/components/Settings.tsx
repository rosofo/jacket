import useSettingsStore from "../hooks/settings";

export default function Settings() {
  const settings = useSettingsStore();
  return (
    <div className="overlay box small">
      {Object.entries(settings.enable).map(([name, enabled]) => (
        <div key={name} className="cluster apart">
          <input
            name={name}
            type="checkbox"
            checked={enabled}
            onChange={() => {
              settings.setEnabled(name, !enabled);
            }}
          />
          <label htmlFor={name}>{name}</label>
        </div>
      ))}
    </div>
  );
}
