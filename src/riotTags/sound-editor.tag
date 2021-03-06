sound-editor.panel.view
    .modal
        b {voc.name}
        br
        input.wide(type="text" value="{sound.name}" onchange="{wire('this.sound.name')}")
        .anErrorNotice(if="{nameTaken}") {vocGlob.nametaken}
        br
        p
            label
                b {voc.poolSize}
                input(type="number" min="1" max="32" value="{sound.poolSize || 5}" onchange="{wire('this.sound.poolSize')}")
        audio(
            if="{sound && sound.origname}"
            ref="audio" controls loop
            src="file://{sessionStorage.projdir + '/snd/' + sound.origname + '?' + sound.lastmod}"
            onplay="{notifyPlayerPlays}"
        )
        p
            label.checkbox
                input(type="checkbox" checked="{sound.isMusic}" onchange="{wire('this.sound.isMusic')}")
                span   {voc.isMusicFile}
        label.file
            .button.wide.nml
                i.icon.icon-plus
                span {voc.import}
            input(type="file" ref="inputsound" accept=".mp3,.ogg,.wav" onchange="{changeSoundFile}")
        p.nmb
            button.wide(onclick="{soundSave}" title="Shift+Control+S" data-hotkey="Control+S")
                i.icon.icon-confirm
                span {voc.save}
    script.
        const path = require('path');
        const fs = require('fs-extra');
        this.namespace = 'soundview';
        this.mixin(window.riotVoc);
        this.mixin(window.riotWired);
        this.playing = false;
        this.sound = this.opts.sound;
        this.on('update', () => {
            if (window.currentProject.sounds.find(sound =>
                this.sound.name === sound.name && this.sound !== sound
            )) {
                this.nameTaken = true;
            } else {
                this.nameTaken = false;
            }
        })
        this.notifyPlayerPlays = e => {
            this.playing = true;
        };
        this.soundSave = e => {
            if (this.playing) {
                this.togglePlay();
            }
            this.parent.editing = false;
            this.parent.update();
        };
        this.togglePlay = function () {
            if (this.playing) {
                this.playing = false;
                this.refs.audio.pause();
            } else {
                this.playing = true;
                this.refs.audio.play();
            }
        };
        this.changeSoundFile = () => {
            var val = this.refs.inputsound.value;
            fs.copy(val, sessionStorage.projdir + '/snd/s' + this.sound.uid + path.extname(val), e => {
                if (e) {
                    console.error(e);
                    alertify.error(e);
                    return;
                }
                if (!this.sound.lastmod && this.sound.name === 'Sound_' + this.sound.uid.split('-').pop()) {
                    this.sound.name = path.basename(val, path.extname(val));
                }
                this.sound.origname = 's' + this.sound.uid + path.extname(val);
                this.sound.lastmod = +(new Date());
                this.update();
            });
            this.refs.inputsound.value = '';
        };
