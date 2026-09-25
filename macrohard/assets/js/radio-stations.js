// Radio stations verified to send Access-Control-Allow-Origin (2026-09-25).
// Measured with: curl -sSL -I -H "Origin: https://qapdex-maker.github.io" <url>
// Re-verify before changing this list; the visualizer needs CORS for the analyser node.
export const CORS_VERIFIED_STATIONS = [
  'https://ice1.somafm.com/defcon-128-mp3',
  'https://ice1.somafm.com/groovesalad-128-mp3',
  'https://ice1.somafm.com/fluid-128-mp3',
  'https://ice1.somafm.com/vaporwaves-128-mp3',
  'https://ice1.somafm.com/beatblender-128-mp3',
  'https://ice1.somafm.com/dronezone-128-mp3',
  'https://ice1.somafm.com/suburbsofgoa-128-mp3',
  'https://ice1.somafm.com/u80s-128-mp3',
  'https://ice1.somafm.com/deepspaceone-128-mp3',
  'https://ice1.somafm.com/lush-128-mp3',
  'https://stream.radioparadise.com/aac-320',
  'https://icecast.radiofrance.fr/fip-midfi.mp3',
  'https://jazz-wr01.ice.infomaniak.ch/jazz-wr01-128.mp3',
  'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
  'https://npr-ice.streamguys1.com/live.mp3',
  'https://fm939.wnyc.org/wnycfm',
  'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
  'https://st01.dlf.de/dlf/01/128/mp3/stream.mp3',
];
