# 08: A hintuan graph, one transfer: design it twice

Status: research (later, 119)
Type: research

## The question

Can Para offer options with one change of ride, from a file built at publish time, that a phone reads and searches fast enough?

## The two designs to compare

1. **A full graph file.**
   - Hintuans as nodes; a ride along a direction, and a short walk between nearby hintuans, as edges.
   - Dijkstra on the phone, one transfer first.
2. **Published transfer pairs.**
   - At publish time, for each pair of directions, the hintuans where one can change to the other (within a short walk), with the walk.
   - The phone joins 01's one-ride search on both sides of a pair.

For each: the file's size, the search's time on a mid-range phone, how the publish builds and checks it, and what the owner must design (a transfer in a row and on the map).

## Answer

A recommendation, written here and in `../README.md`.
