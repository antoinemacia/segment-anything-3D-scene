interface SegmentArgs {
  sourceUrl: string;
  pixelCoordinates: [number, number];
}

interface SegmentResult {
  mask: [number, number][];
}

const BASE_URL = "http://localhost:5000";

export const segment = async (args: SegmentArgs): Promise<SegmentResult> => {
  const res = await post(`${BASE_URL}/segment`, {
    data: {
      source_url: args.sourceUrl,
      pixel_coords: args.pixelCoordinates,
    },
  });

  const body = await res.json();

  return body.data;
};

const post = async (url: string, body: object): Promise<Response> => {
  return fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
};
