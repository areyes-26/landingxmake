export const freeTemplate = {
  outputFormat: "mp4",
  width: 720,
  height: 1280,
  frameRate: "30 fps",
  elements: [
    {
      id: "background",
      type: "image",
      source: "__BG__",
      track: 1,
      time: 0,
      duration: 0.01
    },
    {
      id: "avatar-video",
      type: "video",
      source: "__AVATAR__",
      track: 2,
      time: 0,
      fit: "cover",
      crop: "center",
      width: 720,
      height: 1280,
      x: "50%",
      y: "50%"
    },
    {
      id: "branding-logo",
      type: "image",
      source: "__LOGO__",
      track: 3,
      time: 0,
      x: "85%",
      y: "85%",
      width: "10%",
      height: "10%"
    },
    {
      id: "subtitles-container",
      type: "text",
      track: 4,
      time: 0,
      y: "85%",
      width: "80%",
      height: "12%",
      x_alignment: "50%",
      y_alignment: "50%",
      font_family: "Roboto",
      font_size: "4.5 vmin",
      font_size_minimum: "2.5 vmin",
      font_weight: "600",
      background_color: "__ACCENT__",
      background_x_padding: "5%",
      background_y_padding: "3%",
      background_border_radius: "15%",
      transcript_source: "avatar-video",
      transcript_effect: "bounce",
      transcript_maximum_length: 12,
      transcript_color: "__ACCENT__",
      fill_color: "#ffffff",
      stroke_color: "#000000",
      stroke_width: "0.5 vmin"
    }
  ]
}; 