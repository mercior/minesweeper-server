var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Website
app.get('/', function(req, res){
	res.send('<h1>Hello world</h1>');
});


// Database

var Engine = require('tingodb')(),
    assert = require('assert');

var db = new Engine.Db(__dirname + '/database', {});
var userdb = db.collection("users");


// Utility
Math.seed = 0;

Math.seededRandom = function(min, max) {
   // max = max || 1;
   // min = min || 0;
 
    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    var rnd = Math.seed / 233280;
 
    return Math.floor(min + rnd * (max - min));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// vector
function Vector2di(_x, _y) {
	this.x = _x;
	this.y = _y;
}

// named timers
var _timers = {};
function namedTimerDestroy( name ) {
	if (_timers[ name ] != null) {
		clearTimeout( _timers[ name ] );
		delete _timers[ name ];
	}
}
function namedTimer( name, delay, func ) {
	if (_timers[ name ] != null) {
		namedTimerDestroy( name );
	}
	_timers[ name ] = setTimeout( function(){ func(); delete _timers[ name ]; }, delay * 1000 );
}

// constants / settings
var INITIAL_MOVE_TIMER = 25;
var MOVE_TIMER = 20;
var GAME_PRICES = { 	"newbies": 50, 		"casual": 200, 		"pro": 600 		}
var GAME_PRIZES = { 	"newbies": 250, 	"casual": 1000, 	"pro": 3000 	}

// Minesweeper
function minesweeper() {

	this.Players = [];
	this.Points = [0, 0];
	this.ActivePlayer = null;
	
	this.w = 16;
	this.h = 16;
	
	this.mines = 50;
	this.seed = 0;
	
	this.ResetGame = function() {

		// reset
        this.SetPoints(0, 0, true);

        this.SetActivePlayer(0);
		
		// store timer name
		this.timerName = this.Players[0].name + this.Players[1].name;

		// make blank grid
		this.grid = [];
		for (var x=0; x<this.w; x++) {
			this.grid[x] = [];
			for (var y=0; y<this.h; y++) {
				this.grid[x][y] = {
					
				}
			}
		}

		// seed rng
        Math.seed = getRandomInt(0, 10000000);
		this.seed = Math.seed;
		//console.log("game seed = " + this.seed);

        // place mines
        var mc = 0;
        var tx = Math.seededRandom(0, this.w);
        var ty = Math.seededRandom(0, this.h);
        while (mc < this.mines)
        {
			//console.log("making " + mc + " @ " + tx + ", " + ty);
            if (!this.grid[tx][ty].mine)
            {
                this.grid[tx][ty].mine = true;
                mc++;
            }
            tx = Math.seededRandom(0, this.w);
            ty = Math.seededRandom(0, this.h);
        }

        // set numbers
        for (var x = 0; x < this.h; x++)
            for (var y = 0; y < this.h; y++)
                this.grid[x][y].number = this.GetCellNumber(x, y);


    };

	this.GetCellNumber = function(x, y)
    {
        var num = 0;
        if (x > 0 && y > 0 && this.grid[x - 1][ y - 1].mine) num++;
        if (y > 0 && this.grid[x - 0][ y - 1].mine) num++;
        if (x < this.w - 1 && y > 0 && this.grid[x + 1][ y - 1].mine) num++;

        if (x > 0 && this.grid[x - 1][ y - 0].mine) num++;
        if (x < this.w - 1 && this.grid[x + 1][ y - 0].mine) num++;

        if (x > 0 && y < this.h - 1 && this.grid[x - 1][ y + 1].mine) num++;
        if (y < this.h - 1 && this.grid[x - 0][ y + 1].mine) num++;
        if (x < this.w - 1 && y < this.h - 1 && this.grid[x + 1][ y + 1].mine) num++;

        return num;
    }

	// get surrounding tiles
	this.GetSurrounding = function(x, y)
    {
        var ret = [];
        if (x > 0 && y > 0) ret.push( { 'x': x-1, 'y': y-1 } );
        if (y > 0) ret.push( { 'x': x-0, 'y': y-1 } );
        if (x < this.w - 1 && y > 0) ret.push( { 'x': x+1, 'y': y-1 } );

        if (x > 0) ret.push( { 'x': x-1, 'y': y } );
        if (x < this.w - 1) ret.push( { 'x': x+1, 'y': y } );

        if (x > 0 && y < this.h - 1) ret.push( { 'x': x-1, 'y': y+1 } );
        if (y < this.h - 1) ret.push( { 'x': x-0, 'y': y+1 } );
        if (x < this.w - 1 && y < this.h - 1) ret.push( { 'x': x+1, 'y': y+1 } );

        return ret;
    }

	this.GetUnclickedSurrounding = function(x, y)
    {
        var test = this.GetSurrounding(x, y);
		var ret = [];
		for (var i in test)
			if (!this.grid[test[i].x][test[i].y].clicked)
				ret.push(test[i]);

        return ret;
    }
	
	this.GetClickedMinesSurrounding = function(x, y)
    {
        var test = this.GetSurrounding(x, y);
		var ret = [];
		for (var i in test)
			if (this.grid[test[i].x][test[i].y].clicked && this.grid[test[i].x][test[i].y].mine)
				ret.push(test[i]);

        return ret;
    }
	this.GetClickedNumbersSurrounding = function(x, y)
    {
        var test = this.GetSurrounding(x, y);
		var ret = [];
		for (var i in test)
			if (this.grid[test[i].x][test[i].y].clicked && !this.grid[test[i].x][test[i].y].mine && this.grid[test[i].x][test[i].y].number > 0)
				ret.push(test[i]);

        return ret;
    }


	

	this.NetworkClick = function( d, usr ) {
		var plg = this;

		// is this the activeplayer?
		if (usr != plg.ActivePlayer) { console.log("WARNING: Got a click from the non-active player?"); return false; }
		
		var x = d['x'];
		var y = d['y'];

		// click local copy
		var res = plg.OnClick( x, y );
		
		// Did we click a mine? points +1
		if (res == "mine") {
		
			// click both clients
			for (i=0; i<2; i++)
				plg.Players[i].socket.emit("click", { "x": x, "y": y, "lock": ( i != plg.ActivePlayer.index ) });
			
			//usr.socket.emit("click", { "x": x, "y": y } );
			//usr.opponent.socket.emit("click", { "x": x, "y": y } );

			// refresh move timer
			namedTimer(plg.timerName, MOVE_TIMER, function() {
				FinishMinesweeperGame( plg.ActivePlayer.opponent, null, false, " (Took too long to move)" );
			} );

			plg.AddPoints( plg.ActivePlayer.index, 1 );
			
			// was this all the mines? or and
			if (plg.Points[0] + plg.Points[1] >= plg.mines || plg.Points[0] > plg.mines/2 || plg.Points[1] > plg.mines/2) {
				FinishMinesweeperGame( plg.Points[0] > plg.Points[1] && plg.Players[0] || plg.Players[1] );
			}
			
			return true;

		// anything other than a mine, swap turns
		} else {
		
			// click both clients
			for (i=0; i<2; i++)
				plg.Players[i].socket.emit("click", { "x": x, "y": y, "lock": ( i == plg.ActivePlayer.index ) });

			if (plg.ActivePlayer.index == 0) {
				plg.SetActivePlayer( 1, true );

				namedTimer(plg.timerName, MOVE_TIMER, function() {
					FinishMinesweeperGame( plg.Players[0], null, false, " (Took too long to move)" );
				} );
			} else {
				plg.SetActivePlayer( 0, true );

				namedTimer(plg.timerName, MOVE_TIMER, function() {
					FinishMinesweeperGame( plg.Players[1], null, false, " (Took too long to move)" );
				} );
			}
		
		}
		
		return false;
	}
	
    // remote clicks are handled by x, y (local clicks are passed back to this function by the server)
	this.OnClick = function(x, y, client, silent)
    {
		if (client == null) client = false;
		if (silent == null) silent = false;
	
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return ""; 

        var node = this.grid[x][y];

        if (node.clicked || node.flagged) return "";

        // store last click
        if (!silent) this.ActivePlayer.lastClick = new Vector2di(x, y);

        // mark clicked
        node.clicked = true;

        if (node.mine)
        {
            return "mine";

        } else if (node.number == 0)
        {
            this.OnClick(x - 1, y - 1, false, true);
            this.OnClick(x - 0, y - 1, false, true);
            this.OnClick(x + 1, y - 1, false, true);

            this.OnClick(x - 1, y, false, true);
            this.OnClick(x + 1, y, false, true);

            this.OnClick(x - 1, y + 1, false, true);
            this.OnClick(x - 0, y + 1, false, true);
            this.OnClick(x + 1, y + 1, false, true);

            return "blank";

        } else
        {
            return "number";
        }

    }

	this.SetActivePlayer = function( idx, network )
    {
        this.ActivePlayer = this.Players[ idx ];

		if (network) {
			for (var i=0; i<2; i++)
				this.Players[i].socket.emit("aplayer", { "p": idx });
		}
    }

	this.SetPoints = function(p1, p2, network)
    {
        this.Points[0] = p1;
        this.Points[1] = p2;
		
		if (network) {
			for (var i=0; i<2; i++)
				this.Players[i].socket.emit("points", { "p1": this.Points[0], "p2": this.Points[1] });
		}
    }

	this.AddPoints = function(idx, points)
    {
		this.Points[idx] += points;
        this.SetPoints(this.Points[0], this.Points[1], true);
    }

}

// Finish Game

function StartMinesweeperGame( p1, p2, rematch ) {

	if (rematch == null) rematch = false;

	// server user management
	p1.searching = false;
	p2.searching = false;
	p1.opponent = p2;
	p2.opponent = p1;

	// delete last opponent entries from our last opponent and us
	if (p1.lastOpponent != null) p1.lastOpponent.lastOpponent = null;
	if (p2.lastOpponent != null) p2.lastOpponent.lastOpponent = null;
	p1.lastOpponent = null;
	p2.lastOpponent = null;
	
	p1.requestRematch = null;
	p2.requestRematch = null;
	
	// charge users
	var price = GAME_PRICES[ p1.gameType ];
	var prize = GAME_PRIZES[ p1.gameType ];
	if (!rematch) {
		p1.AddMoney( -price );
		p2.AddMoney( -price );
	}
	
	// create a game instance
	var game = new minesweeper();
	
	// set the players
	game.Players[0] = p1;
	game.Players[1] = p2;
	
	// set player index numbers
	p1.index = 0;
	p2.index = 1;
	
	// intialize it
	game.ResetGame();
	
	// attach game to players
	p2.game = game;
	p1.game = game;
	
	// prepare start data
	var startData = {
		"mines": game.mines,
		"seed": game.seed,
		"pot": prize,
		"player1": p1.name,
		"player2": p2.name,
		"avatar1": p1.avatar,
		"avatar2": p2.avatar,
	}
	
	// tell clients game start, p1s who, and who goes first
	p1.socket.emit('start', startData );
	p2.socket.emit('start', startData );
	
	// start timer
	namedTimer(game.timerName, INITIAL_MOVE_TIMER, function() {
		FinishMinesweeperGame( game.Players[1], null, false, " (Took too long to move)" );
	} );
	
	// debug
	console.log('Game Start: ' + p1.name + ' vs ' + p2.name);
}

function FinishMinesweeperGame( ply, loser, disconnect, msg ) {

	if (msg == null) msg = "";
	if (disconnect == null) disconnect = false;
	if (loser == null) loser = false;

	if (ply.opponent == null || ply.game == null) return;
	
	var plg = ply.game;
	
	// remove timeout
	namedTimerDestroy(plg.timerName);
	
	// find winner
	var plose = 0;
	var pwin = 0;
	
	if (loser) {
		plose = plg.Players[0] == ply ? 0 : 1;
		pwin = plg.Players[1] == ply ? 0 : 1;
	} else {
		plose = plg.Players[1] == ply ? 0 : 1;
		pwin = plg.Players[0] == ply ? 0 : 1;
	}
	
	// award money
	var price = GAME_PRIZES[ plg.Players[pwin].gameType ];
	plg.Players[pwin].AddMoney( price );

	// clear game
	plg.Players[0].game = null;
	plg.Players[1].game = null;

	// save last opponent and clear
	plg.Players[0].lastOpponent = plg.Players[0].opponent;
	plg.Players[1].lastOpponent = plg.Players[1].opponent;
	
	plg.Players[0].opponent = null;
	plg.Players[1].opponent = null;
	
	// notify clients
	plg.Players[0].socket.emit('end', { "winner": pwin, "disconnect": disconnect, "msg": msg });
	plg.Players[1].socket.emit('end', { "winner": pwin, "disconnect": disconnect, "msg": msg });
	
	// debug
}

// Bots

var bots = [];

function gameBot( _lobby, _stupidity ) {

	// random name & avatar
	this.SetRandomUser = function() {
		var names = [ "Chris1992", "DanielBonez", "KubelManDave", "Jilly", "Rachel87", "IssacTheBoss", "Corinne55", "SexyBabe99", "Princess02", "Creeper2", "Bob", "Gregory" ];
		this.name = names[ getRandomInt(0, names.length - 1) ];
		var avatars = [ "avatar_creeper", "avatar_pig", "avatar_enderman", "avatar_zombie", "avatar9", "avatar8", "avatar7", "avatar6", "avatar5" ];
		this.avatar = avatars[ getRandomInt(0, avatars.length - 1) ];
	}
	// join a lobby
	this.JoinLobby = function( lobby ) {
		users.searching.push( this );
		this.searching = lobby;
		this.gameType = lobby;
		this.lobby = lobby;
		addPlayerCount( lobby );
		console.log("bot joined " + lobby);
	}
	// fake money
	this.AddMoney = function() {}
	
	this.ClickLogic = function() {
		var bot = this;
		var possibleClicks = [];
		var likelyClicks = [];
		setTimeout( function() {
			
			// d/c race condition error
			if (bot.game == null) return;
			
			// 	get unclicked around the square
			// 	get clicked mines
			//  look at numbers surrounding each unclicked, does that number have == number of mines surrounding it ?
			// 		if so, remove that unclicked from array
			// 	compare unclicked <= (number - clicked). true =>
			//		guarenteed to click them.

			// guarenteed mines
			for (var x = 0; x < bot.game.w; x ++) {
				for (var y = 0; y < bot.game.h; y ++) {
					if (bot.game.grid[x][y].clicked && bot.game.grid[x][y].number > 0) {
				
						var unclicked = bot.game.GetUnclickedSurrounding(x, y);
						var clicked = bot.game.GetClickedMinesSurrounding(x, y);
						
						//console.log("ai ["+x+","+y+"]: "  + unclicked.length + " unclicked, " + clicked.length + " clicked");
						
						// does each unclicked have clicked numbers around it?
						var tmp = [];
						for (var i in unclicked) {
							var numbers = bot.game.GetClickedNumbersSurrounding( unclicked[i].x, unclicked[i].y );
							var isInvalid = false;
							for (var j in numbers) {
								var clickedMinesSurroundingTheNumber = bot.game.GetClickedMinesSurrounding( numbers[j].x, numbers[j].y );
								if (clickedMinesSurroundingTheNumber.length >= bot.game.grid[numbers[j].x][numbers[j].y].number) {
									isInvalid = true;
									break;
								}
							}
							if (!isInvalid) tmp.push( unclicked[i] );
						}
						unclicked = tmp;
						
						//console.log("ai ["+x+","+y+"]: rebuilt "  + unclicked.length + " unclicked (+" + clicked.length + " clicked)");
						
						// compare unclicked squares
						if (getRandomInt(0, 100) < bot.stupidity) {
							if (unclicked.length > 0 && unclicked.length <= (bot.game.grid[x][y].number - clicked.length)) {
							
								console.log("clicking guarenteed mine");
								if (bot.game.NetworkClick( unclicked[ getRandomInt(0, unclicked.length-1) ], bot ))
									bot.ClickLogic();
									
								return;
							}
						}
						
						// log clicks with a 50/50 chance of win
						if (getRandomInt(0, 100) < bot.stupidity) {
							if (unclicked.length > 0 && unclicked.length - 1 <= (bot.game.grid[x][y].number - clicked.length)) {
								likelyClicks.push( unclicked[ getRandomInt(0, unclicked.length-1) ] );
							}
						}

					}
					if (!bot.game.grid[x][y].clicked) possibleClicks.push( { 'x': x, 'y': y } );
				}
			}
			
			if (likelyClicks.length > 0) {
			
				console.log("clicking likely mine");
				if (bot.game.NetworkClick( likelyClicks[ getRandomInt(0, likelyClicks.length-1) ], bot ))
					bot.ClickLogic();
			
			} else {
			
				// nothing good found, take a guess
				console.log("clicking random mine");
				var click = possibleClicks[ getRandomInt(0, possibleClicks.length-1) ];
				if (bot.game.NetworkClick( { 'x': click.x, 'y': click.y }, bot )) {
					bot.ClickLogic();
					console.log("mine clicked! reclicking");
				}
				
			}
			
		}, getRandomInt(1000, 4000) );
	}
	
	// fake socket
	var bot = this;
	this.socket = {
		'bot': bot,
		'emit': function( em, data ) {
			var bot = this.bot;
			if (em == 'start') {

				bot.ClickLogic();
				
			} else if (em == 'click') {
			
				// ignore echod clicks from ourself
				if (bot.game.ActivePlayer == bot) return;

				bot.ClickLogic();
			
			} else if (em == 'end') {
			
				console.log("game ended");
				removePlayerCount( bot.lobby );
				bot.SetRandomUser();
				bot.JoinLobby( bot.lobby );
			
			} else if (em == 'yes rematch') {
			
				StartMinesweeperGame( bot.lastOpponent, bot, true );
			
			}
		}
	}
	
	
	
	this.SetRandomUser();
	this.coins = 1000000;
	this.device = "bot";
	this.stupidity = _stupidity;
	
	// init
	this.JoinLobby( _lobby );

}




// User class
function gameUser() {
	
	this.DeviceReport = function( d ) {

		this.coins = 0;
		this.avatars = ['default'];
		this.avatar = 'default';
		this.device = d.device;
		
		var usr = this;	// carry variable into scope
		
		// look them up in db
		console.log("lookup " + d.device);
		userdb.findOne({'device':d.device}, function(err, item) {
		
			if (err) console.log("mongo error:" + err);
		
			// new user, maybe didnt yet store a name
			if (item != null) {

				usr.name = item.name;
				usr.coins = item.coins;
				usr.avatar = item.avatar;
				usr.avatars = item.avatars;
				if (usr.avatars == null) usr.avatars = [];
				
				if (item.name == '')
					usr.socket.emit('new user');
				else
					usr.Login();
				
			// brand new user, store with empty name
			} else {

				userdb.insert([{ 'device':d.device, 'name':'', 'coins':250, 'avatars':[ 'default' ], 'avatar':'default' }], {w:1}, function(err, result) {
				
					if (err) console.log("mongo error:" + err);
				
					usr.coins = 250;
					console.log('stored new device: ' + d.device);
				});
				
				usr.socket.emit('new user');
			}
			
		});
	}
	
	this.Login = function() {
		this.socket.emit('login', { 'name': this.name, 'coins': this.coins, 'avatars': this.avatars, 'avatar': this.avatar });
	}
	
	this.CanAfford = function(amt) {
		return this.coins >= amt;
	}
	this.AddMoney = function(amt) {

		this.coins += parseInt(amt);

		if (this.coins < 0) this.coins = 0;
		
		// save coins
		userdb.update(
		   { 'device':this.device },
		   { $set: {
			  'coins': this.coins
		   } }
		);
		
		// tell client
		this.socket.emit('coins', { 'coins': this.coins });
	}
	
	this.EquipAvatar = function(avatar) {

		this.avatar = avatar;
		
		// save it
		userdb.update(
		   { 'device':this.device },
		   { $set: {
			  'avatar': avatar
		   } }
		);
		
		// tell client
		this.socket.emit('equip avatar', { 'avatar': avatar });
	}
	
	this.HasAvatar = function(avatar) {
		for ( av in this.avatars )
		console.log( "checking: " + this.avatars[ av ] );
	
		for ( av in this.avatars )
			if (this.avatars[ av ] == avatar)
				return true;

		return false;
	}
	this.AddAvatar = function(avatar) {

		userdb.update( { 'device':this.device }, { $push: { 'avatars': avatar } } ); // PUSH is pushing a whole duplicate record! check if changing money only has the same efect
		this.avatars.push( avatar );
		
	}
	
}


// Lobby
var users = { 'list': [], 'searching': [] };

function findUser( name ) {
	var ret = null;
	users.list.forEach( function(v, k) {
		if (v.name == name) {
			ret = v;
			return;
		}
	} );
	return ret;
}


// Player count tracking & update
var _playerCounts = {}
function addPlayerCount( game ) {
	if (game == null) return;
	if (_playerCounts[ game ] == null) _playerCounts[ game ] = 0;
	_playerCounts[ game ] ++;
	
	// tell everyone who isn't playing
	users.list.forEach( function(v, k) {
		if (v.gameType == null) {
			v.socket.emit('users', { 'game': game, 'count': _playerCounts[ game ] });
		}
	} );
}
function removePlayerCount( game, usr ) {
	if (game == null) return;
	if (_playerCounts[ game ] == null) _playerCounts[ game ] = 1;
	_playerCounts[ game ] --;
	if (_playerCounts[ game ] < 0) _playerCounts[ game ] = 0;
	
	// tell everyone who isn't playing
	users.list.forEach( function(v, k) {
		if (v.gameType == null || v == usr) {
			v.socket.emit('users', { 'game': game, 'count': _playerCounts[ game ] });
		}
	} );
}
function getPlayerCount( game ) {
	if (game == null) return 0;
	return _playerCounts[ game ] == null ? 0 : _playerCounts[ game ];
}

/*
userdb.insert([{ '_id': 'test', 'name':'', 'coins':250 }], {w:1}, function(err, result) {

	if (err) console.log("error: " + err);

	userdb.update(
		{ '_id': 'test' },
		{ 
			$set: 
			{
				'name': 'hello'
			}
		}
	);

	//userdb.findOne({ _id:'test' }, function(err, item) {
	//	if (item != null) console.log("ok cool"); else console.log("not cool");
	//});
	
});
*/

var cursor = userdb.find( );
cursor.each(function(err, doc) {
	assert.equal(err, null);
	if (doc != null) {
		console.dir(doc);
	}
});


io.on('connection', function(socket){

	// make user object
	var usr = new gameUser();
	usr.socket = socket;
	
	// log
	users.list.push( usr );
	
	// tell them connected count. todo; merge into 1 msg?
	socket.emit('users', { 'game': 'newbies', 'count': getPlayerCount('newbies') });
	socket.emit('users', { 'game': 'casual', 'count': getPlayerCount('casual') });
	socket.emit('users', { 'game': 'pro', 'count': getPlayerCount('pro') });
	
	// tell everyone who isn't playing - TODO: limit this update to once every x seconds ?
	users.list.forEach( function(v, k) {
		if (v.gameType == null) {
			v.socket.emit('users', { 'game': 'all', 'count': io.engine.clientsCount + bots.length });
		}
	} );
	
	// device report
	socket.on('device', function(d){
	
		usr.DeviceReport( d );
		
	});

	// User login / set name
	socket.on('user', function(d){
	
		//  user has no stored name
		if (usr.name == null || usr.name == '') {

			// reject used names
			userdb.findOne({'name':d.name}, function(err, item) {
			
				if (item != null || d.name == "") {
					socket.emit('name taken');
					console.log('reject login: ' + d.name);
					return;
				}
				
				// store local user
				usr.name = d.name;

				// write to database
				userdb.update(
				   { 'device':usr.device },
				   { $set: {
					  'name': d.name,
				   } }
				);
				
				// give them a login
				usr.Login();
				//socket.emit('login', { 'name': usr.name, 'coins': usr.coins });
				
				console.log('set users name: ' + usr.name);
				
			});
		}
	});
		
	socket.on('search', function(d){
	
		// find the price
		
		var price = GAME_PRICES[ d.game ];
		if (price == null) { console.log("WARNING: '" + usr.name + "' searched for an invalid game type '" + d.game + "'"); return; }
		if (!usr.CanAfford( price )) {
			socket.emit('search fail');
			return;
		}
	
		// count them as playing this gametype
		addPlayerCount( d.game );
		usr.gameType = d.game;	// this variable is held until we disconnect or say no to a rematch
		
		// find a game for them to play
		
		// look for a player that is searching
		var done = false;
		users.searching.forEach( function(v, k) {
			if (done) return;
			
			// found a match. mark the 2 players as playing together
			if (v.searching == d.game && v.name != usr.name) { // commented so i can test on the same device

				StartMinesweeperGame( v, usr );

				done = true;
			}
			
		} );
		
		// can't find anyone? mark us as searching
		if (usr.opponent == null) {
		
			// add to global searching user list
			users.searching.push(usr);
			
			usr.searching = d.game;

			console.log('marked ' + usr.name + ' as searching for a ' + d.game + ' game');
		}
	});
	
	// cancel search
	socket.on('cancel search', function(d){
	
		// remove searching status
		console.log("cancel " + usr.gameType + " search");
		
		var tmp = usr.gameType;
		usr.searching = null;
		usr.gameType = null;
		
		removePlayerCount( tmp );
		
		// remove from searching list
		var idx = -1;
		users.searching.forEach( function(v, k) {
			if (v == usr) {
				idx = k;
				return;
			}
		} );
		if (idx > -1)
			users.searching.splice(idx, 1);
			
		// tell client
		socket.emit('search fail', { reason: 'cancel' });
		
	});
	// User watches an ad for coins
	socket.on('ad', function(d){
	
		//  user has no stored name
		if (usr.name == null || usr.name == '') return;

		usr.AddMoney(50 );
		
	});
	
	// User buys from the shop: NOTE: yes the client has authority of the price! but the client can spam 'ad' to get infinite coins so fuck it. there are ways this could be fixed but i think its overkill for now
	socket.on('buy', function(d){
	
		//  user has no stored name
		if (usr.name == null || usr.name == '') return;


		if (!usr.HasAvatar( d.avatar ) && usr.CanAfford(d.price)) {
			usr.AddAvatar( d.avatar );
			usr.AddMoney( -d.price );
			socket.emit('purchase ok', { 'avatar': d.avatar });
		} else {
			socket.emit('purchase not ok');
		}
		
	});
	
	socket.on('equip avatar', function(d){
	
		//  user has no stored name
		if (usr.name == null || usr.name == '' || !usr.HasAvatar( d.avatar )) return;

		// save
		usr.EquipAvatar( d.avatar );

	});
		

	// Chat
	socket.on('chat', function(d){
		
		if (usr.name == null) {
			console.log("unlogged user tried to chat");
			return;
		}
		
		console.log(usr.name + ': ' + d["msg"]);
		d.name = usr.name;
		
		io.emit('chat', d);
	});
	
	// Disconnect
	socket.on('disconnect', function(){
	
		if (usr.name == null){
			console.log('unlogged user disconnected');
			return;
		}
		
		console.log(usr.name + ' disconnected');
		
		// remove them as a player of this gametype
		removePlayerCount( usr.gameType );
		usr.gameType = null;
		
		// remove from searching list
		var idx = -1;
		users.searching.forEach( function(v, k) {
			if (v == usr) {
				idx = k;
				return;
			}
		} );
		if (idx > -1)
			users.searching.splice(idx, 1);
			
		// remove from users list
		var idx = -1;
		users.list.forEach( function(v, k) {
			if (v == usr) {
				idx = k;
				return;
			}
		} );
		if (idx > -1)
			users.list.splice(idx, 1);
			
		// update
		//io.emit('user list', users);
		
		// tell opponent they won
		if (usr.game != null) {
			FinishMinesweeperGame( usr, true, true, " (disconnect)" );
		}
		
		// tell last opponent this guy d/c'd
		if (usr.lastOpponent != null) {
			usr.lastOpponent.socket.emit('no rematch');
		}
		
		// delete user
		usr = null;
	});


	// Minesweeper Click
	socket.on('click', function(d){
	
		if (!usr.opponent) return;
		
		var plg = usr.game;
		
		plg.NetworkClick( d, usr );

	});
	
	// Rematch
	socket.on('no rematch', function(d){
		
		// tell their last opponent
		if (usr.lastOpponent != null)
			usr.lastOpponent.socket.emit("no rematch");
			
		// remove them as a player of this gametype
		removePlayerCount( usr.gameType, usr );
		usr.gameType = null;
		
	});
	socket.on('yes rematch', function(d){
		
		// have last opponent ?
		if (usr.lastOpponent != null)
		
		// do the rematch
		if (usr.lastOpponent.requestRematch) {
			StartMinesweeperGame( usr.lastOpponent, usr, true );
			
			//usr.lastOpponent.requestRematch = null;
			//usr.requestRematch = null;
		
		// request remtch
		} else {
			usr.lastOpponent.socket.emit("yes rematch");
			usr.requestRematch = true;
		}
		
	});
	
	// Give Up
	socket.on('give up', function(d){
		
		if (usr.game != null)
			FinishMinesweeperGame( usr, true, false, " (opponent gave up)" );
		
	});
	
});

// make bots
for (var i = 0; i < 15; i++)
	bots.push( new gameBot('newbies', 75) );
// make bots
for (var i = 0; i < 10; i++)
	bots.push( new gameBot('casual', 50) );
// make bots
for (var i = 0; i < 5; i++)
	bots.push( new gameBot('pro', 10) );


http.listen(process.argv[2], function(){
	console.log('listening on *:' + process.argv[2]);
});
