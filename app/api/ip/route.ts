export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch("https://ipwho.is/", {
      cache: "no-store",
      headers: {
        accept: "application/json"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error("IP service unavailable");
    }

    const data = await response.json();

    if (data.success === false) {
      throw new Error("IP lookup failed");
    }

    return Response.json(
      {
        creator: "XyrexxArchive",
        ip: data.ip ?? null,
        type: data.type ?? null,
        continent: data.continent ?? null,
        country: data.country ?? null,
        countryCode: data.country_code ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        timezone: data.timezone?.id ?? null,
        utc: data.timezone?.utc ?? null,
        isp: data.connection?.isp ?? null,
        org: data.connection?.org ?? null,
        asn: data.connection?.asn ?? null,
        domain: data.connection?.domain ?? null,
        flag: data.flag?.emoji ?? null
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
        error: "Gagal mengambil informasi IP. Coba lagi beberapa saat."
      },
      {
        status: 502
      }
    );
  }
}