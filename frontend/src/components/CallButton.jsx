import { PhoneIcon, VideoIcon } from "lucide-react";

function CallButton({ onAudioCall, onVideoCall, disabled = false }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-base-300 bg-base-200/80 p-1">
      <button
        type="button"
        onClick={onAudioCall}
        disabled={disabled}
        className="btn btn-ghost btn-sm btn-circle hover:bg-base-100"
        aria-label="Start audio call"
        title="Audio call"
      >
        <PhoneIcon className="size-4" />
      </button>

      <button
        type="button"
        onClick={onVideoCall}
        disabled={disabled}
        className="btn btn-ghost btn-sm btn-circle hover:bg-base-100"
        aria-label="Start video call"
        title="Video call"
      >
        <VideoIcon className="size-4" />
      </button>
    </div>
  );
}

export default CallButton;