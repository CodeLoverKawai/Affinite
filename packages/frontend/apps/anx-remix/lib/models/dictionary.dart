class DictionaryModel {
  int? id;
  String name;
  String path;
  bool isActive;
  DateTime createdAt;
  String? md5;

  DictionaryModel({
    this.id,
    required this.name,
    required this.path,
    required this.isActive,
    required this.createdAt,
    this.md5,
  });

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'name': name,
      'path': path,
      'is_active': isActive ? 1 : 0,
      'created_at': createdAt.toIso8601String(),
      'md5': md5,
    };
  }
  factory DictionaryModel.fromMap(Map<String, dynamic> map) {
    return DictionaryModel(
      id: map['id'] as int?,
      name: map['name'] as String,
      path: map['path'] as String,
      isActive: (map['is_active'] as int) == 1,
      createdAt: DateTime.parse(map['created_at'] as String),
      md5: map['md5'] as String?,
    );
  }
}
