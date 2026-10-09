"use client";

import { useCallback, useEffect, useState } from "react";

type Mode = "ip" | "dns" | "domain";

type RecordItem = {
  name: string;
  type: number;
  ttl: number;
  data: string;
};

type Result = Record<string, unknown> & {
  error?: string;
};

const dnsTypes = [
  "A",
  "AAAA",
  "MX",
  "TXT",
  "NS",
  "CNAME",
  "SOA",
  "CAA"
];

const dnsTypeNames: Record<number, string> = {
  1: "A",
  2: "NS",
  5: "CNAME",
  6: "SOA",
  15: "MX",
  16: "TXT",
  28: "AAAA",
  257: "CAA"
};

function Icon({
  name,
  className = ""
}: {
  name: string;
  className?: string;
}) {
  return (
    <i
      aria-hidden="true"
      className={`fa-solid ${name} ${className}`}
    />
  );
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Tidak tersedia";
  }

  if (typeof value === "boolean") {
    return value ? "Aktif" : "Tidak aktif";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Tidak tersedia";
  }

  return String(value);
}

function Detail({
  label,
  value,
  mono = false
}: {
  label: string;
  value: unknown;
  mono?: boolean;
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong className={mono ? "mono" : ""}>
        {formatValue(value)}
      </strong>
    </div>
  );
}

export default function Checker() {
  const [mode, setMode] = useState<Mode>("ip");
  const [query, setQuery] = useState("");
  const [dnsType, setDnsType] = useState("A");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState("");

  const runCheck = useCallback(
    async (
      nextMode: Mode = mode,
      value = query,
      type = dnsType
    ) => {
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const endpoint =
          nextMode === "ip"
            ? "/api/ip"
            : nextMode === "dns"
              ? `/api/dns?domain=${encodeURIComponent(value)}&type=${encodeURIComponent(type)}`
              : `/api/domain?domain=${encodeURIComponent(value)}`;

        const response = await fetch(endpoint, {
          cache: "no-store"
        });

        const data = (await response.json()) as Result;

        if (!response.ok || data.error) {
          throw new Error(data.error || "Permintaan gagal.");
        }

        setResult(data);
        setLastChecked(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Terjadi kesalahan. Silakan coba lagi."
        );
      } finally {
        setLoading(false);
      }
    },
    [mode, query, dnsType]
  );

  useEffect(() => {
    void runCheck("ip", "");
  }, [runCheck]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setQuery("");
    setResult(null);
    setError("");

    if (nextMode === "ip") {
      void runCheck("ip", "");
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (mode !== "ip" && !query.trim()) {
      setError(
        mode === "dns"
          ? "Masukkan domain yang ingin diperiksa."
          : "Masukkan domain untuk melihat metadata."
      );
      return;
    }

    void runCheck();
  }

  async function copyValue(value: unknown) {
    if (value === null || value === undefined) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
    } catch {
      setError(
        "Tidak dapat menyalin otomatis pada browser ini."
      );
    }
  }

  const records = Array.isArray(result?.records)
    ? (result.records as RecordItem[])
    : [];

  const ipDetails = [
    ["Alamat IP", result?.ip, true],
    ["Tipe IP", result?.type, false],
    ["ISP", result?.isp, false],
    ["Organisasi", result?.org, false],
    ["ASN", result?.asn, true],
    ["Domain ISP", result?.domain, false],
    ["Negara", result?.country, false],
    ["Kode negara", result?.countryCode, true],
    ["Benua", result?.continent, false],
    ["Provinsi / region", result?.region, false],
    ["Kota", result?.city, false],
    [
      "Koordinat",
      result?.latitude != null && result?.longitude != null
        ? `${result.latitude}, ${result.longitude}`
        : null,
      true
    ],
    ["Zona waktu", result?.timezone, false],
    ["UTC offset", result?.utc, true]
  ] as const;

  const title = {
    ip: "IP Lookup",
    dns: "DNS Lookup",
    domain: "Domain Metadata"
  }[mode];

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="xyrchecker beranda">
          <span className="brand-mark">
            <Icon name="fa-crosshairs" />
          </span>
          <span>
            xyr<span className="brand-light">checker</span>
          </span>
        </a>

        <div className="topbar-status">
          <span className="status-dot" />
          TOOLS ONLINE
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Icon name="fa-bolt" />
            NETWORK INTELLIGENCE TOOLKIT
          </div>

          <h1>
            Know your
            <br />
            <span>digital footprint.</span>
          </h1>

          <p>
            Periksa IP, telusuri DNS, dan baca metadata domain
            dalam satu tempat. Cepat, simpel, tanpa ribet.
          </p>

          <div className="hero-pills">
            <span>
              <Icon name="fa-shield-halved" />
              Read-only lookup
            </span>
            <span>
              <Icon name="fa-gauge-high" />
              Lightweight UI
            </span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-center">
            <Icon name="fa-globe" />
          </div>
          <span className="art-tag tag-top">IP / DNS</span>
          <span className="art-tag tag-bottom">XYR / 001</span>
          <span className="art-cross cross-one">+</span>
          <span className="art-cross cross-two">+</span>
        </div>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div>
            <span className="section-kicker">WORKSPACE / 01</span>
            <h2>Checker console</h2>
          </div>

          <span className="live-label">
            <span className="status-dot" />
            LIVE QUERY
          </span>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="Jenis pemeriksaan">
          <button
            className={mode === "ip" ? "mode-tab active" : "mode-tab"}
            onClick={() => changeMode("ip")}
            role="tab"
            aria-selected={mode === "ip"}
          >
            <Icon name="fa-location-crosshairs" />
            <span>My IP</span>
          </button>

          <button
            className={mode === "dns" ? "mode-tab active" : "mode-tab"}
            onClick={() => changeMode("dns")}
            role="tab"
            aria-selected={mode === "dns"}
          >
            <Icon name="fa-diagram-project" />
            <span>DNS Lookup</span>
          </button>

          <button
            className={mode === "domain" ? "mode-tab active" : "mode-tab"}
            onClick={() => changeMode("domain")}
            role="tab"
            aria-selected={mode === "domain"}
          >
            <Icon name="fa-globe" />
            <span>Domain Info</span>
          </button>
        </div>

        <form className="query-box" onSubmit={handleSubmit}>
          <div className="query-label">
            <Icon name="fa-terminal" />
            {title.toUpperCase()}
          </div>

          {mode !== "ip" && (
            <label className="sr-only" htmlFor="query">
              Domain
            </label>
          )}

          <div className="query-controls">
            {mode === "dns" && (
              <>
                <label className="sr-only" htmlFor="dns-type">
                  Jenis record DNS
                </label>
                <select
                  id="dns-type"
                  value={dnsType}
                  onChange={(event) => setDnsType(event.target.value)}
                >
                  {dnsTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </>
            )}

            {mode !== "ip" && (
              <input
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "dns" ? "example.com" : "domain.com"
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            )}

            {mode === "ip" && (
              <div className="current-ip-input">
                <Icon name="fa-wifi" />
                <span>Alamat IP publik perangkat ini</span>
              </div>
            )}

            <button
              className="run-button"
              type="submit"
              disabled={loading}
            >
              <Icon
                name={
                  loading
                    ? "fa-spinner fa-spin"
                    : "fa-magnifying-glass"
                }
              />
              <span>
                {loading
                  ? "Checking"
                  : mode === "ip"
                    ? "Refresh IP"
                    : "Check now"}
              </span>
            </button>
          </div>

          <div className="query-foot">
            <span>
              <Icon name="fa-circle-info" />
              {mode === "ip"
                ? "IP publik yang terlihat dari internet"
                : "Gunakan nama domain, bukan URL lengkap"}
            </span>
            <span>HTTPS / API</span>
          </div>
        </form>

        <div className="results-heading">
          <div>
            <span className="section-kicker">OUTPUT / 02</span>
            <h2>
              {mode === "ip"
                ? "IP intelligence"
                : mode === "dns"
                  ? "DNS records"
                  : "Domain profile"}
            </h2>
          </div>

          <span className="result-time">
            {lastChecked
              ? `UPDATED ${lastChecked}`
              : "WAITING FOR QUERY"}
          </span>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <Icon name="fa-triangle-exclamation" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Tutup pesan"
            >
              <Icon name="fa-xmark" />
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-panel">
            <span className="loader" />
            <strong>Mengambil data...</strong>
            <span>Permintaan sedang diproses</span>
          </div>
        )}

        {!loading && result && mode === "ip" && (
          <div className="results-grid">
            <article className="primary-result">
              <div className="result-card-top">
                <span className="result-icon">
                  <Icon name="fa-network-wired" />
                </span>
                <span className="result-badge">PUBLIC IP</span>
              </div>

              <span className="muted-label">
                YOUR PUBLIC ADDRESS
              </span>

              <div className="ip-address">
                {formatValue(result.ip)}
              </div>

              <button
                type="button"
                className="copy-button"
                onClick={() => void copyValue(result.ip)}
              >
                <Icon name="fa-copy" />
                Copy IP
              </button>

              <div className="location-summary">
                <span className="flag-emoji">
                  {formatValue(result.flag)}
                </span>
                <div>
                  <strong>
                    {formatValue(result.city)}
                    {result.city && result.region
                      ? `, ${result.region}`
                      : ""}
                  </strong>
                  <span>{formatValue(result.country)}</span>
                </div>
              </div>
            </article>

            <article className="detail-card">
              <div className="card-heading">
                <h3>
                  <Icon name="fa-list-check" />
                  IP metadata
                </h3>
                <span>14 FIELDS</span>
              </div>

              {ipDetails.map(([label, value, mono]) => (
                <Detail
                  key={label}
                  label={label}
                  value={value}
                  mono={mono}
                />
              ))}

              <button
                type="button"
                className="text-action"
                onClick={() =>
                  void copyValue(JSON.stringify(result, null, 2))
                }
              >
                <Icon name="fa-copy" />
                Copy JSON result
              </button>
            </article>
          </div>
        )}

        {!loading && result && mode === "dns" && (
          <div className="detail-card full-result">
            <div className="card-heading">
              <h3>
                <Icon name="fa-diagram-project" />
                {String(result.domain)}
                <span className="inline-type">
                  {String(result.type)}
                </span>
              </h3>
              <span>{records.length} RECORDS</span>
            </div>

            <div className="dns-summary">
              <div>
                <span>DNS status</span>
                <strong>
                  {Number(result.status) === 0
                    ? "NOERROR"
                    : `STATUS ${String(result.status)}`}
                </strong>
              </div>
              <div>
                <span>DNSSEC flag</span>
                <strong>
                  {result.authenticatedData
                    ? "AD enabled"
                    : "Not confirmed"}
                </strong>
              </div>
            </div>

            {records.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TYPE</th>
                      <th>NAME</th>
                      <th>TTL</th>
                      <th>VALUE</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr
                        key={`${record.name}-${record.type}-${index}`}
                      >
                        <td>
                          <span className="record-type">
                            {dnsTypeNames[record.type] || record.type}
                          </span>
                        </td>
                        <td className="mono">{record.name}</td>
                        <td>{record.ttl}s</td>
                        <td className="mono record-value">
                          {record.data}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              void copyValue(record.data)
                            }
                            aria-label="Salin nilai DNS"
                          >
                            <Icon name="fa-copy" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="fa-inbox" />
                <strong>
                  Tidak ada record {String(result.type)}
                </strong>
                <span>
                  Domain mungkin tidak memiliki record ini.
                </span>
              </div>
            )}

            <button
              type="button"
              className="text-action"
              onClick={() =>
                void copyValue(JSON.stringify(result, null, 2))
              }
            >
              <Icon name="fa-copy" />
              Copy JSON result
            </button>
          </div>
        )}

        {!loading && result && mode === "domain" && (
          <div className="detail-card full-result">
            <div className="card-heading">
              <h3>
                <Icon name="fa-globe" />
                {String(result.domain)}
              </h3>
              <span>RDAP DATA</span>
            </div>

            <div className="domain-grid">
              <Detail label="Registrar" value={result.registrar} />
              <Detail
                label="Domain handle"
                value={result.handle}
                mono
              />
              <Detail
                label="Created"
                value={
                  result.created
                    ? new Date(
                        String(result.created)
                      ).toLocaleString("id-ID")
                    : null
                }
              />
              <Detail
                label="Last updated"
                value={
                  result.updated
                    ? new Date(
                        String(result.updated)
                      ).toLocaleString("id-ID")
                    : null
                }
              />
              <Detail
                label="Expiration"
                value={
                  result.expires
                    ? new Date(
                        String(result.expires)
                      ).toLocaleString("id-ID")
                    : null
                }
              />
              <Detail
                label="DNSSEC"
                value={result.secureDNS}
              />
            </div>

            <div className="subsection">
              <h4>
                <Icon name="fa-server" />
                Nameservers
              </h4>

              <div className="chip-list">
                {Array.isArray(result.nameservers) &&
                result.nameservers.length ? (
                  (result.nameservers as string[]).map((ns) => (
                    <button
                      type="button"
                      key={ns}
                      className="data-chip mono"
                      onClick={() => void copyValue(ns)}
                    >
                      {ns}
                      <Icon name="fa-copy" />
                    </button>
                  ))
                ) : (
                  <span className="empty-inline">
                    Tidak ada data nameserver.
                  </span>
                )}
              </div>
            </div>

            <div className="subsection">
              <h4>
                <Icon name="fa-tags" />
                Domain status
              </h4>

              <div className="chip-list">
                {Array.isArray(result.status) &&
                result.status.length ? (
                  (result.status as string[]).map((status) => (
                    <span key={status} className="data-chip">
                      {status}
                    </span>
                  ))
                ) : (
                  <span className="empty-inline">
                    Tidak ada status tersedia.
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="text-action"
              onClick={() =>
                void copyValue(JSON.stringify(result, null, 2))
              }
            >
              <Icon name="fa-copy" />
              Copy JSON result
            </button>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="empty-state initial-state">
            <Icon name="fa-magnifying-glass-chart" />
            <strong>Hasil akan muncul di sini</strong>
            <span>Pilih tool lalu mulai pemeriksaan.</span>
          </div>
        )}
      </section>

      <section className="bottom-note">
        <div className="note-icon">
          <Icon name="fa-circle-info" />
        </div>
        <div>
          <strong>Informasi penggunaan</strong>
          <p>
            Data lokasi IP adalah perkiraan berdasarkan database
            IP. Metadata domain bergantung pada ketersediaan server
            RDAP dan DNS; sebagian field mungkin tidak tersedia.
          </p>
        </div>
      </section>

      <footer className="footer">
        <a className="footer-brand" href="#">
          <span className="brand-mark">
            <Icon name="fa-crosshairs" />
          </span>
          xyrchecker
        </a>

        <span>
          Built for curious minds. © {new Date().getFullYear()} XYR.
        </span>

        <a className="back-top" href="#">
          <Icon name="fa-arrow-up" />
          Back to top
        </a>
      </footer>
    </main>
  );
}