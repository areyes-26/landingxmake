export const freeTemplate = {
  outputFormat: "mp4",
  dimensions: { width: 1080, height: 1920 },
  elements: [
    {
      id: "bg-img",
      type: "image",
      src: "__BG__",
      x: "50%",
      y: "50%",
      width: 1080,
      height: 1920,
      track: 1
    },
    {
      id: "avatar-video",
      type: "video",
      src: "__AVATAR__",
      x: "50%",
      y: "50%",
      width: 1080,
      height: 1920,
      fit: "cover",
      track: 2
    },
    {
      id: "branding-logo",
      type: "image",
      src: "__LOGO__",
      x: "90%",
      y: "90%",
      width: 120,
      height: 120,
      track: 3
    },
    {
      id: "subtitles",
      type: "subtitles",
      x: "50%",
      y: "90%",
      width: "90%",
      height: 150,
      track: 4,
      style: {
        fontSize: 42,
        fontFamily: "Roboto",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: "__ACCENT__",
        padding: 10,
        borderRadius: 12
      },
      subtitles: "__SUBTITLES__"
    }
  ]
}; 