export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RdapEvent = {
  eventAction?: string;
  eventDate?: string;
};

type RdapEntity = {
  roles?: string[];
  vcardArray?: unknown[];
};

function normalizeDomain(value: string) {
  let input = value.trim().toLowerCase();

  input = input.replace(/^https?:\/\//, "");
  input = input.split(/[/?#]/)[0].replace(/\.$/, "");

  if (
    !input ||
    input.length > 253 ||
    input.includes(":") ||
    input.includes("@") ||
    input.includes(" ")
  ) {
    return null;
  }

  const labels = input.split(".");

  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    return null;
  }

  return input;
}

function getEntityName(
  entities: RdapEntity[],
  role: string
): string | null {
  for (const entity of entities) {
    if (!entity.roles?.includes(role)) continue;

    const card = entity.vcardArray;

    if (!Array.isArray(card) || !Array.isArray(card[1])) {
      continue;
    }

    for (const entry of card[1]) {
      if (
        Array.isArray(entry) &&
        (entry[0] === "fn" || entry[0] === "org")
      ) {
        const value = entry[3];

        if (typeof value === "string") return value;

        if (
          Array.isArray(value) &&
          value.every((part) => typeof part === "string")
        ) {
          return value.join(" ");
        }
      }
    }
  }

  return null;
}

function getEventDate(
  events: RdapEvent[],
  ...actions: string[]
): string | null {
  return (
    events.find((event) =>
      actions.includes(event.eventAction ?? "")
    )?.eventDate ?? null
  );
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/rdap+json, application/json"
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`RDAP_HTTP_${response.status}`);
  }

  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get("domain") ?? "";
  const domain = normalizeDomain(rawDomain);

  if (!domain) {
    return Response.json(
      {
        error: "Masukkan domain valid, contoh: google.com"
      },
      { status: 400 }
    );
  }

  try {
    const bootstrap = await fetchJson(
      "https://data.iana.org/rdap/dns.json"
    );

    const suffixes = domain.split(".");
    const services = bootstrap.services as [string[], string[]][];

    let rdapUrls: string[] = [];

    for (let i = 0; i < suffixes.length; i++) {
      const suffix = suffixes.slice(i).join(".");

      const service = services.find(
        ([tlds]) => tlds.includes(suffix)
      );

      if (service) {
        rdapUrls = service[1];
        break;
      }
    }

    if (!rdapUrls.length) {
      return Response.json(
        {
          error: "Server RDAP tidak ditemukan untuk ekstensi domain ini."
        },
        { status: 404 }
      );
    }

    let data: Record<string, unknown> | null = null;

    for (const baseUrl of rdapUrls) {
      try {
        const endpoint = new URL(
          `domain/${encodeURIComponent(domain)}`,
          baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
        );

        data = await fetchJson(endpoint.toString());
        break;
      } catch {
        continue;
      }
    }

    if (!data) {
      return Response.json(
        {
          error: "Server registri tidak dapat memberikan data domain ini."
        },
        { status: 502 }
      );
    }

    const events = Array.isArray(data.events)
      ? (data.events as RdapEvent[])
      : [];

    const entities = Array.isArray(data.entities)
      ? (data.entities as RdapEntity[])
      : [];

    const nameservers = Array.isArray(data.nameservers)
      ? data.nameservers as { ldhName?: string }[]
      : [];

    const secureDNS = data.secureDNS as
      | { delegationSigned?: boolean }
      | undefined;

    return Response.json(
      {
        creator: "XyrexxArchive",
        domain: data.ldhName ?? domain,
        handle: data.handle ?? null,
        registrar: getEntityName(entities, "registrar"),
        created: getEventDate(
          events,
          "registration",
          "registered"
        ),
        updated: getEventDate(
          events,
          "last changed",
          "last update of RDAP database"
        ),
        expires: getEventDate(
          events,
          "expiration",
          "expiry"
        ),
        status: Array.isArray(data.status) ? data.status : [],
        nameservers: nameservers
          .map((item) => item.ldhName)
          .filter((name): name is string => Boolean(name)),
        secureDNS: secureDNS?.delegationSigned ?? null,
        dnssec: secureDNS?.delegationSigned ?? null,
        entities: entities.map((entity) => ({
          roles: entity.roles ?? []
        })),
        fetchedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      {
        error:
          "Gagal mengambil metadata domain. Coba lagi atau periksa koneksi server."
      },
      { status: 502 }
    );
  }
}
