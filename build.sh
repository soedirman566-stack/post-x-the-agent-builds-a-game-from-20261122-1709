#!/bin/sh
# build.sh — assemble the video: frames -> segments -> body -> captions+music
# -> the official make.fun 16:9 referral end card (press guide recipe).
set -e
cd "$(dirname "$0")"
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

for s in prompt editor game; do
  ffmpeg -y -v error -framerate 30 -i "frames/$s/f%04d.jpg" \
    -c:v libx264 -pix_fmt yuv420p -crf 17 "seg-$s.mp4"
done
printf "file 'seg-prompt.mp4'\nfile 'seg-editor.mp4'\nfile 'seg-game.mp4'\n" > concat.txt
ffmpeg -y -v error -f concat -safe 0 -i concat.txt -c copy body.mp4

# closing captions over the last seconds of gameplay, plus the soundtrack
ffmpeg -y -v error -i body.mp4 -i music.wav -filter_complex "
[0:v]drawtext=fontfile=$FONT:text='One prompt. One agent. Playable.':fontsize=66:fontcolor=white:borderw=3:bordercolor=black@0.6:box=1:boxcolor=black@0.42:boxborderw=20:x=(w-text_w)/2:y=h-190:enable='between(t,42.8,45.4)',
drawtext=fontfile=$FONT:text='Build yours at make.fun':fontsize=72:fontcolor=white:borderw=3:bordercolor=black@0.6:box=1:boxcolor=black@0.42:boxborderw=20:x=(w-text_w)/2:y=h-190:enable='between(t,45.4,47.5)'[v]" \
  -map '[v]' -map 1:a -c:v libx264 -pix_fmt yuv420p -crf 17 -c:a aac -b:a 160k -shortest clip.mp4

# referral end card, exactly per https://make.fun/press/llms.txt (16:9 numbers)
CLIP=clip.mp4 CODE=r3jzr3xj JBM=press/JetBrainsMono-Bold.ttf
W=1920 H=1080 CARD=press/makefun-card-16x9-transparent.webm LEN=2.5 REST=1.433
CX=432 CY=694 CW=5 CH=77 MID=733 SIZE=62 HOLD=0
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$CLIP")
T=$(awk "BEGIN{print $D+$HOLD-$LEN}")
ffmpeg -y -v error -i "$CLIP" -c:v libvpx-vp9 -i "$CARD" -filter_complex "
[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,setsar=1,fps=60,tpad=stop_mode=clone:stop_duration=$HOLD,format=yuva420p,split[clip][soft];
[soft]gblur=sigma=28,eq=saturation=0.35,fade=t=in:st=$T:d=0.8:alpha=1[soft];
[clip][soft]overlay[bg];
[1:v]format=yuva420p,setpts=PTS-STARTPTS+$T/TB[card];
[bg][card]overlay=eof_action=pass,
drawbox=x=$CX-2:y=$CY-2:w=$CW+4:h=$CH+4:color=white:t=fill:enable='gte(t,$T+$REST)',
drawtext=fontfile=$JBM:text=$CODE:fontsize=$SIZE:fontcolor=0x191419:x=$CX:y=$MID-(ascent-descent)/2:enable='gte(t,$T+$REST)'[v]" \
  -map '[v]' -map '0:a?' -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -movflags +faststart \
  the-agent-builds-a-game.mp4
echo "built the-agent-builds-a-game.mp4"
