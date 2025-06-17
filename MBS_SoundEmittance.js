//=============================================================================
// MBS - Sound Emittance (v1.6.1)
//-----------------------------------------------------------------------------
// by Masked (Edited by OM-Devv)
//=============================================================================
//-----------------------------------------------------------------------------
// Especificações do plugin (Não Modifique!)
// Plugin Specifications (Do not modify!)
//
/*:
@author Masked

@plugindesc Allows you to set a sound emittance for events with smooth, interpolated 8-directional 3D positioning.
<MBS SEmittance>

@param Use HRTF
@desc Choose whether to use HRTF panning model for the 3D sound positioning. HRTF provides more realistic 3D sound.
@type boolean
@default true

@param 3D Sound
@desc Determines whether to use tridimensional sound positioning or not. If false, only volume changes with distance.
@type boolean
@default true

@param Mono Sound
@desc Forces all game audio to be mono. Useful for accessibility or specific audio setups.
@type boolean
@default false

@param Audio Smoothing
@desc Controls the smoothness of position and volume transitions. 0.1 is very smooth, 1.0 is instant.
@type number
@decimals 2
@min 0.01
@max 1
@default 0.15

@help
===========================================================================
Introduction (v1.6.1)
===========================================================================
This plugin allows you to set a sound emission for an event. As the player
moves and turns, the sound's 3D position and volume will change relative
to the player's position and orientation.

This version introduces a smoothing (interpolation) system. Instead of
instantly snapping to new positions and volumes when the player turns,
the audio will now transition smoothly. This eliminates harsh audio "cuts"
and creates a far more natural and immersive experience. The amount of
smoothing can be configured in the plugin parameters.

The plugin supports full 8-directional movement, with accurate panning.

===========================================================================
How to use
===========================================================================
To set the sound emittance source file, add a comment like this on the 
event commands:
<s_emittance: folder/file> 

E.g.:
<s_emittance: bgs/Drips>
<s_emittance: se/Bell>

And to set the emittance radius:
<s_e_radius: N>

E.g.:
<s_e_radius: 3>

You can also set the sound volume and pitch by adding the following notes:
<s_e_volume: N>
<s_e_pitch: N>

E.g.:
<s_e_volume: 90>
<s_e_pitch: 50>

The radius is measured in tiles (48x48 px), you can use float values.
If no radius is given, it will be assumed it's 1.

*/
/*:pt
@author Masked

@plugindesc Permite definir uma emissão de som para eventos com posicionamento 3D suave e interpolado de 8 direções.
<MBS SEmittance>

@param Use HRTF
@desc Determina quando usar HRTF para o posicionamento 3D do som. HRTF provê um som 3D mais realista.
@type boolean
@default true

@param 3D Sound
@desc Determina usar posicionamento 3D para o som ou não. Se falso, apenas o volume muda com a distância.
@type boolean
@default true

@param Som Mono
@desc Força todo o áudio do jogo a ser mono. Útil para acessibilidade.
@type boolean
@default false

@param Suavização de Áudio
@desc Controla a suavidade das transições de posição e volume. 0.1 é muito suave, 1.0 é instantâneo.
@type number
@decimals 2
@min 0.01
@max 1
@default 0.15

@help
===========================================================================
Introdução (v1.6.1)
===========================================================================
Este plugin permite que você defina uma emissão de som para um evento.
Conforme o jogador se move e vira, a posição 3D e o volume do som
mudarão em relação à posição e orientação do jogador.

Esta versão introduz um sistema de suavização (interpolação). Em vez de
mudar instantaneamente para novas posições e volumes quando o jogador vira,
o áudio agora fará uma transição suave. Isso elimina "cortes" de áudio
bruscos e cria uma experiência muito mais natural e imersiva. A quantidade
de suavização pode ser configurada nos parâmetros do plugin.

O plugin suporta movimento completo de 8 direções, com áudio preciso.

===========================================================================
Como usar
===========================================================================
Para definir uma emissão de som, ponha num comentário do evento:
<s_emittance: folder/file> 

Ex.:
<s_emittance: bgs/Drips>
<s_emittance: se/Bell>

E para definir o raio de alcance do som:
<s_e_radius: N>

Ex.:
<s_e_radius: 3>

Para definir o volume e frequência (pitch) do som:
<s_e_volume: N>
<s_e_pitch: N>

Ex.:
<s_e_volume: 90>
<s_e_pitch: 50>

O raio é medido em tiles, você pode usar valores decimais se quiser, se 
não for definido um raio, ele será 1.
*/

var Imported = Imported || {};
 
var MBS = MBS || {};
MBS.SoundEmittance = {};

"use strict";

(function ($) {

	var fs = require('fs');

	$.Parameters = $plugins.filter(function(p) {return p.description.contains('<MBS SEmittance>');})[0].parameters;
 	$.Param = $.Param || {};

 	//-----------------------------------------------------------------------------
	// Settings
	//
	$.Param.useHRTF = JSON.parse($.Parameters['Use HRTF'] || 'true');
	$.Param.use3D = JSON.parse($.Parameters['3D Sound'] || 'true');
	$.Param.useMono = JSON.parse($.Parameters['Mono Sound'] || 'false');
	$.Param.smoothingFactor = parseFloat($.Parameters['Audio Smoothing'] || 0.15);

 	//-----------------------------------------------------------------------------
	// Module Functions
	//
	const lerp = (start, end, amount) => start + (end - start) * amount;

	function audioFilename(filename) {
		var ext = AudioManager.audioFileExt();

		if (fs.existsSync(window.location.pathname.replace(/\/[^/]*$/, '/').substring(1) + filename + ext))
			return filename + ext;
		return filename + '.m4a';
	}
	
	$.getPlayerAngle = function() {
        const dir8 = Input.dir8;
        if (dir8 > 0) {
            switch (dir8) {
                case 8: return 0;
                case 9: return Math.PI / 4;
                case 6: return Math.PI / 2;
                case 3: return 3 * Math.PI / 4;
                case 2: return Math.PI;
                case 1: return 5 * Math.PI / 4;
                case 4: return 3 * Math.PI / 2;
                case 7: return 7 * Math.PI / 4;
            }
        }
		switch ($gamePlayer.direction()) {
            case 8: return 0;
            case 6: return Math.PI / 2;
            case 2: return Math.PI;
            case 4: return 3 * Math.PI / 2;
        }
        return 0;
	};

    $.transformCoordinates = function(deltaX, deltaY, playerAngleRad) {
        const cos = Math.cos(playerAngleRad);
        const sin = Math.sin(playerAngleRad);
        const pannerX = deltaX * cos + deltaY * sin;
        const pannerZ = deltaX * sin - deltaY * cos;
        return { x: pannerX, z: pannerZ };
    };

	//-----------------------------------------------------------------------------
	// WebAudio
	//
	var _WebAudio_initialize_old = WebAudio.initialize;
	var WebAudio_clear_old = WebAudio.prototype.clear;

	WebAudio.initialize = function() {
		var result = _WebAudio_initialize_old.apply(this, arguments);
		if (result && this._context && MBS.SoundEmittance.Param.useMono) {
			this._context.destination.channelCount = 1;
		}
		return result;
	};

	Object.defineProperty(WebAudio.prototype, 'position', {
		get: function() {
			return this._position;
		},
		set: function(value) {
			this._position = value;
			if (this._pannerNode)
	        	this._pannerNode.setPosition(this._position[0] || 0, this._position[1] || 0, this._position[2] || 0);
		}
	});

	WebAudio.prototype.clear = function() {
	    WebAudio_clear_old.apply(this, arguments)
	    this._position = [0, 0, 0];
	};

	WebAudio.prototype._updatePanner = function() {
	    if (this._pannerNode) {
	    	this._pannerNode.distanceModel = 'linear';
	    	if ($.Param.useHRTF) {
				this._pannerNode.panningModel = 'HRTF';
			}
	    }
	};

	//-----------------------------------------------------------------------------
	// Game_SoundEmittance
	//
	var $_soundEmittances = [];

	function Game_SoundEmittance() {
		this.initialize.apply(this, arguments);
	}

	Game_SoundEmittance.prototype.initialize = function(filename) {
		this.filename = filename;
		this.volume = 0.9;
		this.pitch = 1;
		this.playing = false;
		this.playParameters = [];
		this.maxDistance = 1;
		this.rawPosition = [0, 0];
	}

	Game_SoundEmittance.prototype.play = function() {
		this.playing = true;
		this.playParameters = arguments;
	}

	Game_SoundEmittance.prototype.stop = function() {
		this.playing = false;
		this.playParameters = [];
	}

	//-----------------------------------------------------------------------------
	// Game_Event
	//
	var Game_Event_update_old = Game_Event.prototype.update;
	var Game_Event_refresh_old = Game_Event.prototype.refresh;
	var Game_Event_setupPage_old = Game_Event.prototype.setupPage;

	Game_Event.prototype.setupPage = function() {
	    Game_Event_setupPage_old.apply(this, arguments);
	    this.setupSEmittance();
	};

	Game_Event.prototype.setupSEmittance = function() {
		if (this._sEmittance) this._sEmittance.stop();

		this._sEmittance = null;
		if (!this.page()) return;

		var list = this.list();
		var comments = "";
		for (const command of list) {
			if (command.code === 108 || command.code === 408) {
				comments += command.parameters[0] + "\n";
			}
		}

		const filename = (/\s*<\s*s_emittance\s*:\s*(.+)\s*>\s*/i.exec(comments) || [])[1];
		if (filename) {
			this._sEmittance = new Game_SoundEmittance(audioFilename(AudioManager._path + filename));
		} else {
			return;
		}

		const radius = (/\s*<\s*s_e_radius\s*:\s*(\d+(\.\d+)?)\s*>\s*/i.exec(comments) || [])[1];
		this._sEmittanceRadius = parseFloat(radius || 1);

		const volume = (/\s*<\s*s_e_volume\s*:\s*(\d+)\s*>\s*/i.exec(comments) || [])[1];
		if (volume && this._sEmittance) {
			this._sEmittance.volume = parseInt(volume) / 100;
		}

		const pitch = (/\s*<\s*s_e_pitch\s*:\s*(\d+)\s*>\s*/i.exec(comments) || [])[1];
		if (pitch && this._sEmittance) {
			this._sEmittance.pitch = parseInt(pitch) / 100;
		}
	};

	Game_Event.prototype.update = function() {
	    Game_Event_update_old.apply(this, arguments);
	    this.updateSEmittance();
	};

	Game_Event.prototype.updateSEmittance = function() {
		if (this._sEmittance) {
			if (!this._sEmittance.playing) {
				this._sEmittance.play(true, 0); // true = loop
				this._sEmittance.maxDistance = this._sEmittanceRadius || 1;
			}
			this._sEmittance.rawPosition = [this._realX - $gamePlayer._realX, this._realY - $gamePlayer._realY];
		}
	};

	Game_Event.prototype.refresh = function() {
		Game_Event_refresh_old.apply(this, arguments);
		this.refreshSEmittance();
	}

	Game_Event.prototype.refreshSEmittance = function() {
		if (this._sEmittance) {
			if ($_soundEmittances.some(e => e._evEmittance === this._sEmittance)) return;

			var emittance = new WebAudio(this._sEmittance.filename);
			emittance._evEmittance = this._sEmittance;
			emittance.volume = this._sEmittance.volume;
			emittance.pitch = this._sEmittance.pitch;
			emittance._hasStarted = false; // Add state flag
			
			$_soundEmittances.push(emittance);
		}
	};

	Game_Event.prototype.stopSEmittance = function() {
		if (this._sEmittance) this._sEmittance.stop();
	};

	//-----------------------------------------------------------------------------
	// Game_Map
	//
	var Game_Map_setupEvents = Game_Map.prototype.setupEvents;

	Game_Map.prototype.setupEvents = function() {
		$_soundEmittances.forEach(e => e.stop());
		$_soundEmittances = [];
	    Game_Map_setupEvents.apply(this, arguments);
	};

	//-----------------------------------------------------------------------------
	// Scene_Map
	//
	var Scene_Map_update_old    = Scene_Map.prototype.update;
	var Scene_Map_start     = Scene_Map.prototype.start;
	var Scene_Map_terminate = Scene_Map.prototype.terminate;

	Scene_Map.prototype.update = function() {
		Scene_Map_update_old.apply(this, arguments);
		
		const playerAngle = $.getPlayerAngle();
		const smoothing = $.Param.smoothingFactor;

		for (let i = $_soundEmittances.length - 1; i >= 0; i--) {
			const emittance = $_soundEmittances[i];
			const source = emittance._evEmittance;

			if (!source.playing) {
				emittance.stop();
				$_soundEmittances.splice(i, 1);
				continue;
			}
			
			const dx = source.rawPosition[0];
			const dy = source.rawPosition[1];
			
			const distance = Math.sqrt(dx*dx + dy*dy);
			const maxDist = source.maxDistance > 0 ? source.maxDistance : 1;
			const targetVolume = source.volume * Math.max(0, (maxDist - distance) / maxDist);
			let targetPosition = [0, 0, 0];

			if ($.Param.use3D) {
				const coords = $.transformCoordinates(dx, dy, playerAngle);
				targetPosition = [coords.x, 0, coords.z];
			}
			
			// --- STATE LOGIC FIX ---
			if (!emittance._hasStarted && emittance.isReady()) {
				// State 1: First time playing. Snap to values and start.
				emittance._hasStarted = true;
				emittance.volume = targetVolume;
				if ($.Param.use3D) emittance.position = targetPosition;

				emittance.play.apply(emittance, source.playParameters);
				if (emittance._pannerNode) {
					emittance._pannerNode.maxDistance = source.maxDistance;
				}
			} else if (emittance._hasStarted && emittance.isPlaying()) {
				// State 2: Already playing. Smoothly update values.
				emittance.volume = lerp(emittance.volume, targetVolume, smoothing);
				if ($.Param.use3D) {
					const newX = lerp(emittance.position[0], targetPosition[0], smoothing);
					const newZ = lerp(emittance.position[2], targetPosition[2], smoothing);
					emittance.position = [newX, 0, newZ];
				}
			}
		}
	}

	Scene_Map.prototype.start = function() {
		Scene_Map_start.apply(this, arguments);
		$gameMap.refresh();
	}

	Scene_Map.prototype.terminate = function() {
		Scene_Map_terminate.apply(this, arguments);
		$_soundEmittances.forEach(e => e.stop());
		$_soundEmittances = [];
	}

})(MBS.SoundEmittance);

// Registering the plugin
if (Imported["MVCommons"]) {
 	PluginManager.register("MBS_SoundEmittance", 1.6, "Allows you to set a sound emittance for events with smooth, interpolated 8-directional 3D positioning.", {  
     	email: "masked.rpg@gmail.com",
    	name: "Masked", 
 	    website: "N/A"
    }, "2023-10-27");
} else {
	Imported.MBS_SoundEmittance = 1.6;
}