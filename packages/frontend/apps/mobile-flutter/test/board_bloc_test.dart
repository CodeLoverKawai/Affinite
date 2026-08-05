import 'package:flutter_test/flutter_test.dart';
import 'package:affinite_mobile_flutter/bloc/board_bloc.dart';
import 'package:affinite_mobile_flutter/models/board_models.dart';

void main() {
  group('BoardBloc Tests', () {
    late BoardBloc boardBloc;

    setUp(() {
      boardBloc = BoardBloc();
    });

    tearDown(() {
      boardBloc.close();
    });

    test('initial state is BoardInitialState', () {
      expect(boardBloc.state, isA<BoardInitialState>());
    });

    test('LoadBoardEvent emits BoardLoadedState with initial columns and cards', () async {
      boardBloc.add(LoadBoardEvent());
      await expectLater(
        boardBloc.stream,
        emits(isA<BoardLoadedState>()),
      );

      final state = boardBloc.state as BoardLoadedState;
      expect(state.boardData.columns.length, equals(3));
      expect(state.boardData.cards.length, equals(3));
    });

    test('AddColumnEvent adds new column to state', () async {
      boardBloc.add(LoadBoardEvent());
      await boardBloc.stream.firstWhere((s) => s is BoardLoadedState);

      boardBloc.add(const AddColumnEvent('Review'));
      await expectLater(
        boardBloc.stream,
        emits(predicate<BoardLoadedState>((s) => s.boardData.columns.length == 4)),
      );
    });

    test('MoveCardEvent moves card to target column', () async {
      boardBloc.add(LoadBoardEvent());
      await boardBloc.stream.firstWhere((s) => s is BoardLoadedState);

      boardBloc.add(const MoveCardEvent(cardId: 'card-1', targetColumnId: 'col-3'));
      await expectLater(
        boardBloc.stream,
        emits(predicate<BoardLoadedState>((s) {
          final card = s.boardData.cards.firstWhere((c) => c.id == 'card-1');
          return card.columnId == 'col-3';
        })),
      );
    });
  });
}
