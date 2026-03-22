#!/bin/bash

docker-compose exec mongo mongo islanti --quiet --eval 'db.game.find().sort({createdAt:-1}).limit(50).forEach(function(g){print(g.createdAt.toISOString()+" | "+g.players.map(function(p){return p.nick;}).join(", "));})'
