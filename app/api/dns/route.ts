const allowedTypes = new Set([
  "A",
  "AAAA",
  "MX",
  "TXT",
  "NS",
  "CNAME",
  "SOA",
  "CAA"
]);

function validDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");

  return (
    domain.length <= 253 &&
    domain.length > 0 &&
    domain.split(".").length >= 2 &&
    domain.split(".").every((part) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part)
    )
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = (url.searchParams.get("domain") || "").trim();
  const type = (url.searchParams.get("type") || "A").toUpperCase();

  if (!validDomain(domain)) {
    return Response.json(
      {
        error: "Masukkan domain yang valid, contoh: example.com."
      },
      {
        status: 400
      }
    );
  }

  if (!allowedTypes.has(type)) {
    return Response.json(
      {
        error: "Jenis DNS tidak didukung."
      },
      {
        status: 400
      }
    );
  }

  try {
    const endpoint = new URL("https://cloudflare-dns.com/dns-query");

    endpoint.searchParams.set("name", domain);
    endpoint.searchParams.set("type", type);

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        accept: "application/dns-json"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error("DNS provider error");
    }

    const data = await response.json();

    return Response.json(
      {
        domain,
        type,
        creator: "XyrexxArchive",
        status: data.Status ?? null,
        authenticatedData: data.AD ?? false,
        records: (data.Answer ?? []).map(
          (record: {
            name: string;
            type: number;
            TTL: number;
            data: string;
          }) => ({
            name: record.name,
            type: record.type,
            ttl: record.TTL,
            data: record.data
          })
        ),
        authority: (data.Authority ?? []).map(
          (record: {
            name: string;
            type: number;
            TTL: number;
            data: string;
          }) => ({
            name: record.name,
            type: record.type,
            ttl: record.TTL,
            data: record.data
          })
        )
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
        error: "Pengecekan DNS gagal. Periksa koneksi atau coba lagi."
      },
      {
        status: 502
      }
    );
  }
}